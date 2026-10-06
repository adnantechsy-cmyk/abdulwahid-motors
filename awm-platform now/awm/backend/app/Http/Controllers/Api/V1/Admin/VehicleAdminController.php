<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Enums\VehicleStatus;
use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Services\Checkout\CheckoutException;
use App\Services\Frontend\FrontendCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/** Figma 1:21749 (inventory list) and 1:2 (edit / hide / sale status). */
class VehicleAdminController extends Controller
{
    /** GET /admin/vehicles?status=&published=&category_id=&q= */
    public function index(Request $request)
    {
        $locale = app()->getLocale();

        $page = Vehicle::with('category')
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->has('published'), fn ($q) => $q->where('is_published', $request->boolean('published')))
            ->when($request->query('category_id'), fn ($q, $c) => $q->where('category_id', $c))
            ->when($request->query('powertrain'), fn ($q, $p) => $q->where('powertrain', $p))
            ->when($request->query('branch'), fn ($q, $b) => $q->where('branch', $b))
            ->when($request->query('q'), function ($q, $term) {
                $like = '%' . addcslashes($term, '%_\\') . '%';
                $q->where(fn ($w) => $w->where('sku', 'like', $like)->orWhere('vin', 'like', $like)
                    ->orWhere('name->ar', 'like', $like)->orWhere('name->en', 'like', $like));
            })
            ->orderBy('sort_order')->latest('id')
            ->paginate((int) $request->query('per_page', 25));

        return [
            // KPI strip + filter-tab counts, independent of the current filter.
            'counts' => Vehicle::selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status')->all()
                + ['hidden' => Vehicle::where('is_published', false)->count()],
            'data' => collect($page->items())->map(fn (Vehicle $v) => $this->row($v, $locale)),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ];
    }

    public function show(Vehicle $vehicle)
    {
        return $this->full($vehicle->load('category', 'seo'));
    }

    public function store(Request $request)
    {
        $vehicle = Vehicle::create($this->validated($request) + ['status' => VehicleStatus::Available]);
        FrontendCache::purge('vehicles', 'sitemap');

        return response()->json($this->full($vehicle), 201);
    }

    public function update(Request $request, Vehicle $vehicle)
    {
        $vehicle->update($this->validated($request, $vehicle));
        FrontendCache::purge('vehicles', 'sitemap', 'seo');

        return $this->full($vehicle->fresh('category'));
    }

    /** PUT /admin/vehicles/{vehicle}/status {status} */
    public function setStatus(Request $request, Vehicle $vehicle)
    {
        $status = VehicleStatus::from($request->validate(['status' => ['required', Rule::enum(VehicleStatus::class)]])['status']);

        if ($status !== VehicleStatus::Reserved && $this->hasActiveReservation($vehicle)) {
            if ($status !== VehicleStatus::Sold) {
                throw new CheckoutException('This car is held by an online reservation. Cancel that order first.', 'reserved_online');
            }
        }

        $vehicle->update(match ($status) {
            VehicleStatus::Sold => ['status' => $status, 'sold_at' => now()],
            VehicleStatus::Reserved => ['status' => $status, 'reserved_at' => now()],   // showroom reservation, no order
            default => ['status' => $status, 'reserved_order_id' => null, 'reserved_at' => null, 'sold_at' => null],
        });
        FrontendCache::purge('vehicles', 'seo');

        return $this->row($vehicle->fresh('category'), app()->getLocale());
    }

    /** PUT /admin/vehicles/{vehicle}/visibility {is_published} */
    public function setVisibility(Request $request, Vehicle $vehicle)
    {
        $vehicle->update($request->validate(['is_published' => ['required', 'boolean']]));
        FrontendCache::purge('vehicles', 'sitemap');

        return $this->row($vehicle->fresh('category'), app()->getLocale());
    }

    /** POST /admin/vehicles/{vehicle}/images  multipart: images[], as=cover|gallery */
    public function uploadImages(Request $request, Vehicle $vehicle)
    {
        $data = $request->validate([
            'images' => ['required', 'array', 'max:20'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            'as' => ['required', 'in:cover,gallery'],
        ]);

        $paths = collect($data['images'])->map(fn ($file) => $file->store("vehicles/{$vehicle->id}", 'public'));

        if ($data['as'] === 'cover') {
            $old = $vehicle->cover_image;
            $vehicle->update(['cover_image' => $paths->first()]);
            if ($old && ! in_array($old, $vehicle->gallery ?? [], true)) {
                Storage::disk('public')->delete($old);
            }
        } else {
            $vehicle->update(['gallery' => array_values(array_merge($vehicle->gallery ?? [], $paths->all()))]);
        }
        FrontendCache::purge('vehicles', 'seo');

        return $this->full($vehicle->fresh('category'));
    }

    /** PUT /admin/vehicles/{vehicle}/gallery {gallery: [paths in new order]}: reorder or remove */
    public function updateGallery(Request $request, Vehicle $vehicle)
    {
        $current = $vehicle->gallery ?? [];
        $data = $request->validate(['gallery' => ['present', 'array'], 'gallery.*' => ['string', Rule::in($current)]]);

        foreach (array_diff($current, $data['gallery']) as $removed) {
            if ($removed !== $vehicle->cover_image) {
                Storage::disk('public')->delete($removed);
            }
        }
        $vehicle->update(['gallery' => array_values(array_unique($data['gallery']))]);
        FrontendCache::purge('vehicles');

        return $this->full($vehicle->fresh('category'));
    }

    /** Soft delete: order history keeps working; restore is possible from the database. */
    public function destroy(Vehicle $vehicle)
    {
        if ($this->hasActiveReservation($vehicle)) {
            throw new CheckoutException('This car is held by an online reservation. Cancel that order first.', 'reserved_online');
        }
        $vehicle->delete();
        FrontendCache::purge('vehicles', 'sitemap');

        return response()->noContent();
    }

    private function hasActiveReservation(Vehicle $v): bool
    {
        return $v->reserved_order_id !== null && \App\Models\Order::whereKey($v->reserved_order_id)
            ->whereNotIn('status', [OrderStatus::Cancelled->value, OrderStatus::Failed->value, OrderStatus::Refunded->value])
            ->exists();
    }

    private function validated(Request $request, ?Vehicle $v = null): array
    {
        $req = $v ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$req, 'array'],
            'name.ar' => [$req, 'string', 'max:150'],
            'name.en' => [$req, 'string', 'max:150'],
            'tagline' => ['nullable', 'array'], 'tagline.*' => ['nullable', 'string', 'max:200'],
            'description' => ['nullable', 'array'], 'description.*' => ['nullable', 'string', 'max:10000'],
            'slug' => ['nullable', 'alpha_dash', 'max:190', Rule::unique('vehicles')->ignore($v?->id)],
            'sku' => ['nullable', 'string', 'max:60', Rule::unique('vehicles')->ignore($v?->id)],
            'vin' => ['nullable', 'string', 'size:17', Rule::unique('vehicles')->ignore($v?->id)],
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('type', 'vehicle')],
            'model_year' => [$req, 'integer', 'between:2000,' . (now()->year + 1)],
            'body_type' => ['nullable', 'string', 'max:30'],
            'powertrain' => [$req, 'in:bev,phev,hev,ice'],
            'exterior_color' => ['nullable', 'string', 'max:40'],
            'specs' => ['nullable', 'array'],
            'price' => [$req, 'numeric', 'min:0'],
            'deposit_amount' => [$req, 'numeric', 'min:0', 'lte:price'],
            'currency' => [$req, 'in:USD,SYP'],
            'branch' => ['nullable', Rule::in(array_keys(config('awm.branches')))],
            'is_published' => ['nullable', 'boolean'],
            'is_featured' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
    }

    private function row(Vehicle $v, string $locale): array
    {
        return [
            'id' => $v->id,
            'slug' => $v->slug,
            'sku' => $v->sku,
            'name' => $v->getTranslation('name', $locale),
            'model_year' => $v->model_year,
            'vin' => $v->vin,
            'powertrain' => $v->powertrain,
            'exterior_color' => $v->exterior_color,
            'specs' => $v->specs,
            'category' => $v->category?->getTranslation('name', $locale),
            'price' => (string) $v->price,
            'deposit_amount' => (string) $v->deposit_amount,
            'currency' => $v->currency,
            'status' => ['code' => $v->status->value, 'label' => $v->status->label($locale)],
            'is_published' => $v->is_published,
            'is_featured' => $v->is_featured,
            'branch' => $v->branch,
            'image' => $v->coverUrl(),
            'reserved_order_id' => $v->reserved_order_id,
            'updated_at' => $v->updated_at?->toAtomString(),
        ];
    }

    /** Edit form: all translations, raw paths + urls. */
    private function full(Vehicle $v): array
    {
        $url = fn ($p) => $p ? Storage::disk('public')->url($p) : null;

        return $v->only(['id', 'slug', 'sku', 'vin', 'category_id', 'model_year', 'body_type', 'powertrain', 'exterior_color',
            'specs', 'currency', 'branch', 'is_published', 'is_featured', 'sort_order', 'reserved_order_id']) + [
            'name' => $v->getTranslations('name'),
            'tagline' => $v->getTranslations('tagline'),
            'description' => $v->getTranslations('description'),
            'price' => (string) $v->price,
            'deposit_amount' => (string) $v->deposit_amount,
            'status' => $v->status->value,
            'cover_image' => ['path' => $v->cover_image, 'url' => $url($v->cover_image)],
            'gallery' => collect($v->gallery ?? [])->map(fn ($p) => ['path' => $p, 'url' => $url($p)])->values(),
            'reserved_at' => $v->reserved_at?->toAtomString(),
            'sold_at' => $v->sold_at?->toAtomString(),
        ];
    }
}

<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\VehicleStatus;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Showroom cars: create and edit, hide/show the price, publish, and attach the PDF catalogue and cover photo.
 * A car that is Reserved by an order can't have its status changed here (the order flow owns that).
 */
class VehicleAdminController extends Controller
{
    /** GET /admin/vehicles?q=&status=&published=1|0 */
    public function index(Request $request)
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:60'],
            'status' => ['nullable', 'in:available,incoming,reserved,sold'],
            'published' => ['nullable', 'in:0,1'],
        ]);
        $q = $data['q'] ?? null;

        return Vehicle::query()
            ->when($q, fn ($query) => $query->where(fn ($w) => $w
                ->where('sku', 'like', "%{$q}%")
                ->orWhere('vin', 'like', "%{$q}%")
                ->orWhere('name->ar', 'like', "%{$q}%")
                ->orWhere('name->en', 'like', "%{$q}%")))
            ->when($data['status'] ?? null, fn ($query, $s) => $query->where('status', $s))
            ->when(isset($data['published']), fn ($query) => $query->where('is_published', $data['published'] === '1'))
            ->orderBy('sort_order')->latest('id')
            ->paginate(20)
            ->through(fn (Vehicle $v) => $this->row($v));
    }

    /** GET /admin/vehicles/{vehicle} */
    public function show(Vehicle $vehicle)
    {
        return $this->row($vehicle) + [
            'tagline' => $vehicle->getTranslations('tagline'),
            'description' => $vehicle->getTranslations('description'),
            'vin' => $vehicle->vin,
            'body_type' => $vehicle->body_type,
            'exterior_color' => $vehicle->exterior_color,
            'deposit_amount' => (string) $vehicle->deposit_amount,
            'is_featured' => $vehicle->is_featured,
            'sort_order' => $vehicle->sort_order,
            'cover_url' => $vehicle->coverUrl(),
            'brochure_url' => $vehicle->brochureUrl(),
            'specs' => (object) ($vehicle->specs ?? []),
            'gallery' => collect($vehicle->gallery ?? [])->map(fn ($p) => ['path' => $p, 'url' => Storage::disk('public')->url($p)])->values(),
        ];
    }

    /** GET /admin/vehicle-categories */
    public function categories()
    {
        $locale = app()->getLocale();

        return Category::ofType('vehicle')->orderBy('sort_order')->get()
            ->map(fn (Category $c) => ['id' => $c->id, 'name' => $c->getTranslation('name', $locale)])->values();
    }

    public function store(Request $request)
    {
        $vehicle = Vehicle::create($this->validated($request));

        return response()->json($this->show($vehicle->fresh()), 201);
    }

    public function update(Request $request, Vehicle $vehicle)
    {
        $data = $this->validated($request, $vehicle);

        // Reserved cars belong to their order until it is paid out or cancelled.
        if ($vehicle->status === VehicleStatus::Reserved) {
            unset($data['status']);
        }
        if (($data['status'] ?? null) === 'sold' && $vehicle->status !== VehicleStatus::Sold) {
            $data['sold_at'] = now();
        }

        $vehicle->update($data);

        return $this->show($vehicle->fresh());
    }

    /** POST /admin/vehicles/{vehicle}/brochure  (multipart: brochure = PDF, max 15 MB) */
    public function uploadBrochure(Request $request, Vehicle $vehicle)
    {
        $request->validate(['brochure' => ['required', 'file', 'mimes:pdf', 'mimetypes:application/pdf', 'max:15360']]);

        // A random name: the original file name is never trusted or kept.
        $path = $request->file('brochure')->storeAs('brochures', Str::uuid() . '.pdf', 'public');
        $this->forget($vehicle->brochure_path);
        $vehicle->update(['brochure_path' => $path]);

        return $this->show($vehicle->fresh());
    }

    public function deleteBrochure(Vehicle $vehicle)
    {
        $this->forget($vehicle->brochure_path);
        $vehicle->update(['brochure_path' => null]);

        return $this->show($vehicle->fresh());
    }

    /** POST /admin/vehicles/{vehicle}/cover  (multipart: image = jpg/png/webp, max 5 MB) */
    public function uploadCover(Request $request, Vehicle $vehicle)
    {
        $request->validate(['image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']]);

        $file = $request->file('image');
        $path = $file->storeAs('vehicles', Str::uuid() . '.' . $file->guessExtension(), 'public');
        $this->forget($vehicle->cover_image);
        $vehicle->update(['cover_image' => $path]);

        return $this->show($vehicle->fresh());
    }

    /** POST /admin/vehicles/{vehicle}/gallery  (multipart: image, up to 12 photos per car) */
    public function addGalleryImage(Request $request, Vehicle $vehicle)
    {
        $request->validate(['image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']]);

        $gallery = $vehicle->gallery ?? [];
        abort_if(count($gallery) >= 12, 422, 'A car can have at most 12 gallery photos.');

        $file = $request->file('image');
        $gallery[] = $file->storeAs('vehicles/gallery', Str::uuid() . '.' . $file->guessExtension(), 'public');
        $vehicle->update(['gallery' => array_values($gallery)]);

        return $this->show($vehicle->fresh());
    }

    /** DELETE /admin/vehicles/{vehicle}/gallery/{index} */
    public function removeGalleryImage(Vehicle $vehicle, int $index)
    {
        $gallery = array_values($vehicle->gallery ?? []);
        abort_unless(isset($gallery[$index]), 404);

        $this->forget($gallery[$index]);
        unset($gallery[$index]);
        $vehicle->update(['gallery' => array_values($gallery)]);

        return $this->show($vehicle->fresh());
    }

    /** PUT /admin/vehicles/{vehicle}/gallery  {order: [2,0,1]}: the new order, as positions in the current list. */
    public function reorderGallery(Request $request, Vehicle $vehicle)
    {
        $data = $request->validate(['order' => ['required', 'array'], 'order.*' => ['integer', 'min:0']]);
        $gallery = array_values($vehicle->gallery ?? []);

        $order = array_values($data['order']);
        $sorted = $order;
        sort($sorted);
        abort_unless($sorted === range(0, count($gallery) - 1) || ($gallery === [] && $order === []), 422, 'The new order must list every photo exactly once.');

        $vehicle->update(['gallery' => array_map(fn ($i) => $gallery[$i], $order)]);

        return $this->show($vehicle->fresh());
    }

    private function forget(?string $path): void
    {
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }

    private function row(Vehicle $v): array
    {
        $locale = app()->getLocale();

        return [
            'id' => $v->id,
            'sku' => $v->sku,
            'slug' => $v->slug,
            'name' => $v->getTranslations('name'),
            'display_name' => $v->getTranslation('name', $locale),
            'model_year' => $v->model_year,
            'powertrain' => $v->powertrain,
            'price' => (string) $v->price,
            'show_price' => $v->show_price,
            'currency' => $v->currency,
            'status' => $v->status->value,
            'branch' => $v->branch,
            'is_published' => $v->is_published,
            'has_brochure' => filled($v->brochure_path),
            'has_cover' => filled($v->cover_image),
            'category_id' => $v->category_id,
        ];
    }

    private function validated(Request $request, ?Vehicle $vehicle = null): array
    {
        $create = $vehicle === null;
        $req = $create ? 'required' : 'sometimes';

        return $request->validate([
            'sku' => ['nullable', 'string', 'max:60', Rule::unique('vehicles', 'sku')->ignore($vehicle?->id)],
            'vin' => ['nullable', 'string', 'size:17', 'alpha_num', Rule::unique('vehicles', 'vin')->ignore($vehicle?->id)],
            'name' => [$req, 'array'],
            'name.ar' => [$req, 'string', 'max:160'],
            'name.en' => [$req, 'string', 'max:160'],
            'tagline' => ['nullable', 'array'],
            'tagline.ar' => ['nullable', 'string', 'max:200'],
            'tagline.en' => ['nullable', 'string', 'max:200'],
            'description' => ['nullable', 'array'],
            'description.ar' => ['nullable', 'string', 'max:5000'],
            'description.en' => ['nullable', 'string', 'max:5000'],
            'model_year' => [$req, 'integer', 'between:1990,2100'],
            'body_type' => ['nullable', 'string', 'max:30'],
            'powertrain' => [$req, 'in:bev,phev,hev,ice'],
            'exterior_color' => ['nullable', 'string', 'max:40'],
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('type', 'vehicle')],
            'price' => [$req, 'numeric', 'min:0', 'max:999999999'],
            'show_price' => ['sometimes', 'boolean'],
            'deposit_amount' => ['sometimes', 'numeric', 'min:0', 'max:999999999'],
            'currency' => [$req, 'in:USD,SYP'],
            'status' => ['sometimes', 'in:available,incoming,sold'],
            'branch' => ['nullable', 'in:sahnaya,kafr_sousa'],
            'is_published' => ['sometimes', 'boolean'],
            'is_featured' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            // Spec keys end in their unit (range_km, battery_kwh, power_hp...): the site shows the unit from the key.
            'specs' => ['nullable', 'array', 'max:40', function (string $attribute, mixed $value, \Closure $fail) {
                foreach (array_keys((array) $value) as $key) {
                    if (! preg_match('/^[a-z][a-z0-9_]{1,39}$/', (string) $key)) {
                        $fail("Spec name \"{$key}\" must be lowercase letters, digits and underscores.");
                    }
                }
            }],
            'specs.*' => ['nullable', 'string', 'max:80'],
        ]);
    }
}

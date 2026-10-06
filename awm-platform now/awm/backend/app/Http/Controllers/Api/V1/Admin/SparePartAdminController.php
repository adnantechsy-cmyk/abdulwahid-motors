<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\SparePart;
use App\Models\StockMovement;
use App\Services\Checkout\CheckoutException;
use App\Services\Frontend\FrontendCache;
use App\Services\Inventory\InsufficientStockException;
use App\Services\Inventory\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/** Figma 1:20349 (spare parts & inventory). stock_quantity is never edited directly: see adjustStock(). */
class SparePartAdminController extends Controller
{
    public function __construct(private StockService $stock) {}

    /** GET /admin/parts?q=&category_id=&low_stock=1&published= */
    public function index(Request $request)
    {
        $locale = app()->getLocale();

        $page = SparePart::with('category')
            ->when($request->query('category_id'), fn ($q, $c) => $q->where('category_id', $c))
            ->when($request->boolean('low_stock'), fn ($q) => $q->lowStock())
            ->when($request->has('published'), fn ($q) => $q->where('is_published', $request->boolean('published')))
            ->when($request->query('q'), function ($q, $term) {
                $like = '%' . addcslashes($term, '%_\\') . '%';
                $q->where(fn ($w) => $w->where('sku', 'like', $like)->orWhere('oem_number', 'like', $like)
                    ->orWhere('bin_location', 'like', $like)
                    ->orWhere('name->ar', 'like', $like)->orWhere('name->en', 'like', $like));
            })
            ->orderBy('sku')
            ->paginate((int) $request->query('per_page', 50));

        return [
            'counts' => [
                'total' => SparePart::count(),
                'low_stock' => SparePart::lowStock()->count(),
                'out_of_stock' => SparePart::whereColumn('stock_quantity', '<=', 'reserved_quantity')->count(),
                'hidden' => SparePart::where('is_published', false)->count(),
                // Stock value at cost, per currency (parts without a cost price are skipped).
                'stock_value' => SparePart::whereNotNull('cost_price')->groupBy('currency')
                    ->select('currency', DB::raw('SUM(cost_price * stock_quantity) as value'))->get()
                    ->map(fn ($r) => ['currency' => $r->currency, 'value' => (string) $r->value]),
            ],
            'data' => collect($page->items())->map(fn (SparePart $p) => $this->row($p, $locale)),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ];
    }

    public function show(SparePart $part)
    {
        return $this->full($part->load('category')) + [
            'movements' => $this->movementsQuery($part)->limit(20)->get()->map(fn ($m) => $this->movement($m)),
        ];
    }

    /** Creating a part with initial_stock books it as a "purchase" movement. */
    public function store(Request $request)
    {
        $data = $this->validated($request) + $request->validate(['initial_stock' => ['nullable', 'integer', 'min:0']]);
        $initial = (int) ($data['initial_stock'] ?? 0);
        unset($data['initial_stock']);

        $part = DB::transaction(function () use ($data, $initial, $request) {
            $part = SparePart::create($data + ['stock_quantity' => 0]);
            if ($initial > 0) {
                $this->stock->move($part, $initial, 'purchase', null, $request->user()->id, 'Initial stock');
            }

            return $part;
        });
        FrontendCache::purge('parts', 'sitemap');

        return response()->json($this->full($part->fresh('category')), 201);
    }

    public function update(Request $request, SparePart $part)
    {
        $part->update($this->validated($request, $part));
        FrontendCache::purge('parts', 'sitemap', 'seo');

        return $this->full($part->fresh('category'));
    }

    /**
     * POST /admin/parts/{part}/stock  {type: purchase|adjustment|return, quantity, note}
     * purchase/return add stock; adjustment may be +/- (stock count corrections) and needs a note.
     */
    public function adjustStock(Request $request, SparePart $part)
    {
        $data = $request->validate([
            'type' => ['required', 'in:purchase,adjustment,return'],
            'quantity' => ['required', 'integer', 'not_in:0', 'between:-100000,100000'],
            'note' => ['nullable', 'required_if:type,adjustment', 'string', 'max:255'],
        ]);
        if ($data['type'] !== 'adjustment' && $data['quantity'] < 0) {
            throw new CheckoutException('Purchases and returns add stock: use a positive quantity.', 'invalid_quantity');
        }

        try {
            $movement = $this->stock->move($part, (int) $data['quantity'], $data['type'], null, $request->user()->id, $data['note'] ?? null);
        } catch (InsufficientStockException $e) {
            throw new CheckoutException($e->getMessage(), 'insufficient_stock');
        }
        FrontendCache::purge('parts');

        return ['part' => $this->row($part->fresh('category'), app()->getLocale()), 'movement' => $this->movement($movement)];
    }

    /** GET /admin/parts/{part}/movements */
    public function movements(SparePart $part)
    {
        return $this->movementsQuery($part)->paginate(50)->through(fn ($m) => $this->movement($m));
    }

    /** POST /admin/parts/{part}/image  multipart: image */
    public function uploadImage(Request $request, SparePart $part)
    {
        $request->validate(['image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192']]);
        $old = $part->cover_image;
        $part->update(['cover_image' => $request->file('image')->store("parts/{$part->id}", 'public')]);
        if ($old) {
            Storage::disk('public')->delete($old);
        }
        FrontendCache::purge('parts');

        return $this->full($part->fresh('category'));
    }

    public function destroy(SparePart $part)
    {
        if ($part->reserved_quantity > 0) {
            throw new CheckoutException('Units of this part are held by unpaid orders.', 'part_reserved');
        }
        $part->delete();
        FrontendCache::purge('parts', 'sitemap');

        return response()->noContent();
    }

    private function movementsQuery(SparePart $part)
    {
        return StockMovement::where('spare_part_id', $part->id)->with(['user:id,name', 'reference'])->latest('id');
    }

    private function movement(StockMovement $m): array
    {
        return [
            'id' => $m->id,
            'type' => $m->type,
            'quantity_change' => $m->quantity_change,
            'balance_after' => $m->balance_after,
            'reference' => $m->reference_type ? ['type' => $m->reference_type, 'number' => $m->reference?->number] : null,
            'user' => $m->user?->name,
            'note' => $m->note,
            'at' => $m->created_at->toAtomString(),
        ];
    }

    private function validated(Request $request, ?SparePart $p = null): array
    {
        $req = $p ? 'sometimes' : 'required';

        return $request->validate([
            'sku' => [$req, 'string', 'max:100', Rule::unique('spare_parts')->ignore($p?->id)],
            'slug' => ['nullable', 'alpha_dash', 'max:190', Rule::unique('spare_parts')->ignore($p?->id)],
            'oem_number' => ['nullable', 'string', 'max:100'],
            'name' => [$req, 'array'],
            'name.ar' => [$req, 'string', 'max:150'],
            'name.en' => [$req, 'string', 'max:150'],
            'description' => ['nullable', 'array'], 'description.*' => ['nullable', 'string', 'max:5000'],
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('type', 'spare_part')],
            'price' => [$req, 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'currency' => [$req, 'in:USD,SYP'],
            'is_oem' => ['nullable', 'boolean'],
            'compatible_models' => ['nullable', 'array'], 'compatible_models.*' => ['string', 'max:60'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'bin_location' => ['nullable', 'string', 'max:40'],
            'is_published' => ['nullable', 'boolean'],
            'hide_when_out_of_stock' => ['nullable', 'boolean'],
        ]);
    }

    private function row(SparePart $p, string $locale): array
    {
        return [
            'id' => $p->id,
            'sku' => $p->sku,
            'oem_number' => $p->oem_number,
            'name' => $p->getTranslation('name', $locale),
            'category' => $p->category?->getTranslation('name', $locale),
            'price' => (string) $p->price,
            'cost_price' => $p->cost_price !== null ? (string) $p->cost_price : null,
            'currency' => $p->currency,
            'stock_quantity' => $p->stock_quantity,
            'reserved_quantity' => $p->reserved_quantity,
            'available' => $p->availableQuantity(),
            'is_low_stock' => $p->isLowStock(),
            'low_stock_threshold' => $p->low_stock_threshold,
            'compatible_models' => $p->compatible_models ?? [],
            'bin_location' => $p->bin_location,
            'is_published' => $p->is_published,
            'image' => $p->coverUrl(),
        ];
    }

    private function full(SparePart $p): array
    {
        return array_merge($this->row($p, app()->getLocale()), $p->only(['slug', 'category_id', 'is_oem', 'compatible_models',
            'low_stock_threshold', 'hide_when_out_of_stock']), [
            'name' => $p->getTranslations('name'),              // edit form needs both languages
            'description' => $p->getTranslations('description'),
        ]);
    }
}

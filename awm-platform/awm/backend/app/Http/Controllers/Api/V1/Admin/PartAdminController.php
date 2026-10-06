<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\SparePart;
use App\Models\StockMovement;
use App\Services\Inventory\InsufficientStockException;
use App\Services\Inventory\StockService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Spare-parts inventory. Parts are created and edited here but never deleted (unpublish instead, so order
 * history keeps its links). stock_quantity is read-only in the form: it only changes through StockService
 * (the adjust action below), which keeps the audit log complete.
 */
class PartAdminController extends Controller
{
    public function __construct(private StockService $stock) {}

    /** GET /admin/parts?q=&category=<id>&stock=low|out|ok&published=1|0 */
    public function index(Request $request)
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:60'],
            'category' => ['nullable', 'integer'],
            'stock' => ['nullable', 'in:low,out,ok'],
            'published' => ['nullable', 'in:0,1'],
        ]);
        $q = $data['q'] ?? null;

        return SparePart::with('category')
            ->when($q, fn ($query) => $query->where(fn ($w) => $w
                ->where('sku', 'like', "%{$q}%")
                ->orWhere('oem_number', 'like', "%{$q}%")
                ->orWhere('name->ar', 'like', "%{$q}%")
                ->orWhere('name->en', 'like', "%{$q}%")))
            ->when($data['category'] ?? null, fn ($query, $id) => $query->where('category_id', $id))
            ->when(isset($data['published']), fn ($query) => $query->where('is_published', $data['published'] === '1'))
            ->when(($data['stock'] ?? null) === 'low', fn ($query) => $query->lowStock()->whereRaw('(stock_quantity - reserved_quantity) > 0'))
            ->when(($data['stock'] ?? null) === 'out', fn ($query) => $query->whereRaw('(stock_quantity - reserved_quantity) <= 0'))
            ->when(($data['stock'] ?? null) === 'ok', fn ($query) => $query->whereRaw('(stock_quantity - reserved_quantity) > low_stock_threshold'))
            ->orderBy('sku')
            ->paginate(20)
            ->through(fn (SparePart $p) => $this->row($p));
    }

    /** GET /admin/parts/{part}: everything the edit form needs, with both languages. */
    public function show(SparePart $part)
    {
        return $this->row($part) + [
            'description' => $part->getTranslations('description'),
            'cost_price' => $part->cost_price !== null ? (string) $part->cost_price : null,
            'compatible_models' => $part->compatible_models ?? [],
            'bin_location' => $part->bin_location,
            'hide_when_out_of_stock' => $part->hide_when_out_of_stock,
        ];
    }

    /** GET /admin/part-categories: for the category dropdown. */
    public function categories()
    {
        $locale = app()->getLocale();

        return Category::ofType('spare_part')->orderBy('sort_order')->get()
            ->map(fn (Category $c) => ['id' => $c->id, 'name' => $c->getTranslation('name', $locale)])->values();
    }

    /** POST /admin/parts. `initial_stock` is booked as a purchase movement, not written straight to the column. */
    public function store(Request $request)
    {
        $data = $this->validated($request);
        $initial = (int) ($request->validate(['initial_stock' => ['nullable', 'integer', 'min:0', 'max:100000']])['initial_stock'] ?? 0);

        $part = SparePart::create($data);
        if ($initial > 0) {
            $this->stock->move($part, $initial, 'purchase', null, $request->user()->id, 'Opening stock');
        }

        return response()->json($this->show($part->fresh()), 201);
    }

    /** PUT /admin/parts/{part}. The SKU is fixed after creation (orders and the slug refer to it). */
    public function update(Request $request, SparePart $part)
    {
        $part->update($this->validated($request, $part));

        return $this->show($part->fresh());
    }

    /** POST /admin/parts/{part}/stock  {type: purchase|adjustment|return, change: +/- int, note} */
    public function adjust(Request $request, SparePart $part)
    {
        $data = $request->validate([
            'type' => ['required', 'in:purchase,adjustment,return'],
            'change' => ['required', 'integer', 'not_in:0', 'between:-100000,100000'],
            'note' => ['required_if:type,adjustment', 'nullable', 'string', 'max:200'],
        ]);

        // Receiving stock or taking a return can only add; only a correction may remove units.
        if ($data['type'] !== 'adjustment' && $data['change'] < 0) {
            return response()->json(['message' => 'Only a correction can remove stock.', 'code' => 'bad_direction'], 422);
        }

        try {
            $this->stock->move($part, (int) $data['change'], $data['type'], null, $request->user()->id, $data['note'] ?? null);
        } catch (InsufficientStockException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'insufficient_stock'], 422);
        }

        return $this->show($part->fresh());
    }

    /** GET /admin/parts/{part}/movements: the last 50 stock changes. */
    public function movements(SparePart $part)
    {
        return StockMovement::with(['user:id,name', 'reference'])
            ->where('spare_part_id', $part->id)
            ->latest('id')->limit(50)->get()
            ->map(fn (StockMovement $m) => [
                'id' => $m->id,
                'type' => $m->type,
                'change' => $m->quantity_change,
                'balance' => $m->balance_after,
                'note' => $m->note,
                'by' => $m->user?->name,
                'reference' => $m->reference?->number ?? null,
                'created_at' => $m->created_at->toAtomString(),
            ])->values();
    }

    private function row(SparePart $p): array
    {
        $locale = app()->getLocale();

        return [
            'id' => $p->id,
            'sku' => $p->sku,
            'oem_number' => $p->oem_number,
            'name' => $p->getTranslations('name'),
            'display_name' => $p->getTranslation('name', $locale),
            'category' => $p->category ? ['id' => $p->category->id, 'name' => $p->category->getTranslation('name', $locale)] : null,
            'price' => (string) $p->price,
            'currency' => $p->currency,
            'is_oem' => $p->is_oem,
            'is_published' => $p->is_published,
            'stock_quantity' => $p->stock_quantity,
            'reserved_quantity' => $p->reserved_quantity,
            'available_quantity' => $p->availableQuantity(),
            'low_stock_threshold' => $p->low_stock_threshold,
            'is_low_stock' => $p->isLowStock(),
        ];
    }

    private function validated(Request $request, ?SparePart $part = null): array
    {
        $create = $part === null;
        $req = $create ? 'required' : 'sometimes';

        return $request->validate([
            'sku' => $create ? ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9._\\-\\/]+$/', Rule::unique('spare_parts', 'sku')] : ['prohibited'],
            'oem_number' => ['nullable', 'string', 'max:100'],
            'name' => [$req, 'array'],
            'name.ar' => [$req, 'string', 'max:200'],
            'name.en' => [$req, 'string', 'max:200'],
            'description' => ['nullable', 'array'],
            'description.ar' => ['nullable', 'string', 'max:3000'],
            'description.en' => ['nullable', 'string', 'max:3000'],
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('type', 'spare_part')],
            'price' => [$req, 'numeric', 'min:0', 'max:999999999'],
            'cost_price' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'currency' => [$req, 'in:USD,SYP'],
            'is_oem' => ['sometimes', 'boolean'],
            'compatible_models' => ['nullable', 'array', 'max:60'],
            'compatible_models.*' => ['string', 'max:60'],
            'low_stock_threshold' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'bin_location' => ['nullable', 'string', 'max:40'],
            'is_published' => ['sometimes', 'boolean'],
            'hide_when_out_of_stock' => ['sometimes', 'boolean'],
        ]);
    }
}

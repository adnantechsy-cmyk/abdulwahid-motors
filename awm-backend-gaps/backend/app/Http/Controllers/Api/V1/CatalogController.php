<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SparePart;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

/** Public catalogue read by Next.js (SSR). Responses are already localised by SetApiLocale. */
class CatalogController extends Controller
{
    /** GET /api/v1/vehicles?status=&powertrain=&body_type=&per_page= */
    public function vehicles(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', 'in:available,incoming,reserved,sold'],
            'powertrain' => ['nullable', 'in:bev,phev,hev,ice'],
            'body_type' => ['nullable', 'string', 'max:30'],
            'featured' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
        ]);

        $page = Vehicle::listed()
            ->when($data['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($data['powertrain'] ?? null, fn ($q, $v) => $q->where('powertrain', $v))
            ->when($data['body_type'] ?? null, fn ($q, $v) => $q->where('body_type', $v))
            ->when($request->boolean('featured'), fn ($q) => $q->where('is_featured', true))
            // Sold cars stay listed but sink to the bottom.
            ->orderByRaw("status = 'sold'")
            ->orderBy('sort_order')
            ->latest('id')
            ->paginate($data['per_page'] ?? 12);

        return $this->paged($page, fn (Vehicle $v) => $v->toPublicArray(app()->getLocale()));
    }

    /** GET /api/v1/vehicles/{slug} */
    public function vehicle(string $slug)
    {
        return Vehicle::listed()->where('slug', $slug)->firstOrFail()->toPublicArray(app()->getLocale());
    }

    /** GET /api/v1/parts?category=&model=&q=&in_stock=&per_page= */
    public function parts(Request $request)
    {
        $data = $request->validate([
            'category' => ['nullable', 'string', 'max:60'],
            'model' => ['nullable', 'string', 'max:60'],
            'q' => ['nullable', 'string', 'max:100'],
            'in_stock' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
        ]);

        $page = SparePart::listed()
            ->when($data['category'] ?? null, fn ($q, $v) => $q->where('category', $v))
            ->when($data['model'] ?? null, fn ($q, $v) => $q->whereJsonContains('compatible_models', $v))
            ->when($request->boolean('in_stock'), fn ($q) => $q->whereColumn('stock_quantity', '>', 'reserved_quantity'))
            ->when($data['q'] ?? null, function ($q, $term) {
                $like = '%' . addcslashes($term, '%_\\') . '%';
                $q->where(fn ($w) => $w->where('sku', 'like', $like)
                    ->orWhere('oem_number', 'like', $like)
                    ->orWhere('name->ar', 'like', $like)
                    ->orWhere('name->en', 'like', $like));
            })
            ->orderBy('category')
            ->latest('id')
            ->paginate($data['per_page'] ?? 24);

        return $this->paged($page, fn (SparePart $p) => $p->toPublicArray(app()->getLocale()));
    }

    /** GET /api/v1/parts/{slug} */
    public function part(string $slug)
    {
        return SparePart::listed()->where('slug', $slug)->firstOrFail()->toPublicArray(app()->getLocale());
    }

    private function paged(LengthAwarePaginator $page, callable $map): array
    {
        return [
            'data' => collect($page->items())->map($map)->values(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ];
    }
}

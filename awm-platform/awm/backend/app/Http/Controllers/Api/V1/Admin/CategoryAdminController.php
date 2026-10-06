<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Figma 1:5479: add / manage car and spare-part categories. */
class CategoryAdminController extends Controller
{
    /** GET /admin/categories?type=spare_part */
    public function index(Request $request)
    {
        $request->validate(['type' => ['nullable', 'in:vehicle,spare_part']]);

        return Category::query()
            ->when($request->query('type'), fn ($q, $t) => $q->ofType($t))
            ->withCount(['spareParts', 'vehicles'])
            ->orderBy('type')->orderBy('sort_order')->get()
            ->map(fn (Category $c) => [
                'id' => $c->id,
                'type' => $c->type,
                'parent_id' => $c->parent_id,
                'slug' => $c->slug,
                'name' => $c->getTranslations('name'),
                'description' => $c->getTranslations('description'),
                'image' => $c->image,
                'sort_order' => $c->sort_order,
                'is_active' => $c->is_active,
                'items_count' => $c->type === 'vehicle' ? $c->vehicles_count : $c->spare_parts_count,
            ]);
    }

    public function store(Request $request)
    {
        return response()->json(Category::create($this->validated($request)), 201);
    }

    public function update(Request $request, Category $category)
    {
        $category->update($this->validated($request, $category));

        return $category->fresh();
    }

    /** Items in a deleted category become uncategorised (FK nullOnDelete), never deleted. */
    public function destroy(Category $category)
    {
        $category->delete();

        return response()->noContent();
    }

    private function validated(Request $request, ?Category $category = null): array
    {
        $type = $request->input('type', $category?->type);

        return $request->validate([
            'type' => [$category ? 'sometimes' : 'required', 'in:vehicle,spare_part'],
            'parent_id' => ['nullable', Rule::exists('categories', 'id')->where('type', $type),
                Rule::notIn(array_filter([$category?->id]))],
            'slug' => ['nullable', 'alpha_dash', 'max:80',
                Rule::unique('categories')->where('type', $type)->ignore($category?->id)],
            'name' => [$category ? 'sometimes' : 'required', 'array'],
            'name.ar' => [$category ? 'sometimes' : 'required', 'string', 'max:120'],
            'name.en' => [$category ? 'sometimes' : 'required', 'string', 'max:120'],
            'description' => ['nullable', 'array'],
            'description.*' => ['nullable', 'string', 'max:1000'],
            'image' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}

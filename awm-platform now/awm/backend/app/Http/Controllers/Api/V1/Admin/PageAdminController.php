<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Page;
use App\Services\Frontend\FrontendCache;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** CMS pages (About sections, policies...). SEO for each page is edited in the SEO module. */
class PageAdminController extends Controller
{
    public function index()
    {
        return Page::orderBy('sort_order')->get()->map(fn (Page $p) => [
            'id' => $p->id,
            'slug' => $p->slug,
            'title' => $p->getTranslations('title'),
            'template' => $p->template,
            'is_published' => $p->is_published,
            'updated_at' => $p->updated_at?->toAtomString(),
        ]);
    }

    public function show(Page $page)
    {
        return $this->full($page);
    }

    public function store(Request $request)
    {
        $page = Page::create($this->validated($request) + ['updated_by' => $request->user()->id]);
        FrontendCache::purge('pages', 'sitemap');

        return response()->json($this->full($page), 201);
    }

    public function update(Request $request, Page $page)
    {
        $page->update($this->validated($request, $page) + ['updated_by' => $request->user()->id]);
        FrontendCache::purge('pages', 'sitemap', 'seo');

        return $this->full($page->fresh());
    }

    public function destroy(Page $page)
    {
        $page->delete();
        FrontendCache::purge('pages', 'sitemap');

        return response()->noContent();
    }

    private function validated(Request $request, ?Page $p = null): array
    {
        $req = $p ? 'sometimes' : 'required';

        return $request->validate([
            'slug' => [$req, 'alpha_dash', 'max:120', Rule::unique('pages')->ignore($p?->id)],
            'title' => [$req, 'array'], 'title.ar' => [$req, 'string', 'max:190'], 'title.en' => [$req, 'string', 'max:190'],
            'excerpt' => ['nullable', 'array'], 'excerpt.*' => ['nullable', 'string', 'max:500'],
            'body' => ['nullable', 'array'], 'body.*' => ['nullable', 'string', 'max:100000'],
            'sections' => ['nullable', 'array'],
            'template' => ['nullable', 'string', 'max:40'],
            'is_published' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
    }

    private function full(Page $p): array
    {
        return $p->only(['id', 'slug', 'template', 'is_published', 'sort_order', 'sections']) + [
            'title' => $p->getTranslations('title'),
            'excerpt' => $p->getTranslations('excerpt'),
            'body' => $p->getTranslations('body'),
            'updated_at' => $p->updated_at?->toAtomString(),
        ];
    }
}

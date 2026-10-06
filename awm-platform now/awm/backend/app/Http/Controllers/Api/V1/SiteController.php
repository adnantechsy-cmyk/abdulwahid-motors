<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Page;
use App\Models\Setting;

/** Public site content for Next.js: settings (header/footer/contact) and CMS pages. */
class SiteController extends Controller
{
    /** GET /api/v1/settings  (cache tag "settings" on the frontend) */
    public function settings()
    {
        $locale = app()->getLocale();

        return [
            'name' => config("awm.name.{$locale}"),
            'values' => Setting::publicValues($locale),
            'branches' => collect(config('awm.branches'))->map(fn ($b, $code) => [
                'code' => $code,
                'name' => $b['name'][$locale],
                'street' => $b['street'][$locale],
                'city' => $b['city'][$locale],
            ])->values(),
        ];
    }

    /** GET /api/v1/pages/{slug}  (cache tag "pages") */
    public function page(string $slug)
    {
        $locale = app()->getLocale();
        $page = Page::published()->where('slug', $slug)->firstOrFail();

        return [
            'slug' => $page->slug,
            'template' => $page->template,
            'title' => $page->getTranslation('title', $locale),
            'excerpt' => $page->getTranslation('excerpt', $locale) ?: null,
            'body' => $page->getTranslation('body', $locale) ?: null,
            // sections hold {ar,en} leaves; resolve them to the request locale.
            'sections' => $this->localise($page->sections ?? [], $locale),
            'updated_at' => $page->updated_at?->toAtomString(),
        ];
    }

    private function localise(mixed $node, string $locale): mixed
    {
        if (! is_array($node)) {
            return $node;
        }
        if (array_keys($node) === ['ar', 'en'] || array_keys($node) === ['en', 'ar']) {
            return $node[$locale] ?? null;
        }

        return array_map(fn ($child) => $this->localise($child, $locale), $node);
    }
}

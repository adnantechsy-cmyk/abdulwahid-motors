<?php

namespace App\Services\Seo;

use App\Models\Concerns\HasSeo;
use App\Models\Page;
use App\Models\SeoMeta;
use App\Models\SparePart;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SeoService
{
    public function __construct(private JsonLdBuilder $jsonLd) {}

    /* ---------------- Read side (what Next.js generateMetadata consumes) ---------------- */

    public function forRoute(string $routeKey, string $locale): array
    {
        $cfg = config("awm.static_routes.{$routeKey}") ?? abort(404);
        $meta = SeoMeta::where('route_key', $routeKey)->first();

        $payload = $this->assemble($meta, $locale, $cfg['path'], [
            'title' => config("awm.name.{$locale}"),
            'description' => null,
            'image' => null,
            'og_type' => 'website',
        ]);

        // The homepage also carries the business entity.
        $payload['json_ld'] = $routeKey === 'home' ? [$this->jsonLd->organization($locale)] : [];

        return $payload;
    }

    public function forModel(Model $model, string $locale): array
    {
        /** @var Model&HasSeo $model */
        $payload = $this->assemble($model->seo, $locale, $model->seoPath(), $model->seoDefaults($locale));
        $url = $payload['canonical'];

        $payload['json_ld'] = match (true) {
            $model instanceof Vehicle => [
                $this->jsonLd->vehicle($model, $locale, $url),
                $this->jsonLd->breadcrumbs($this->trail($locale, 'vehicles', $model->getTranslation('name', $locale), $url)),
            ],
            $model instanceof SparePart => [
                $this->jsonLd->part($model, $locale, $url),
                $this->jsonLd->breadcrumbs($this->trail($locale, 'parts', $model->getTranslation('name', $locale), $url)),
            ],
            default => [],
        };

        // Admin can merge extra/override JSON-LD fields on the main entity.
        if ($model->seo?->schema_overrides && isset($payload['json_ld'][0])) {
            $payload['json_ld'][0] = array_replace_recursive($payload['json_ld'][0], $model->seo->schema_overrides);
        }

        return $payload;
    }

    private function assemble(?SeoMeta $meta, string $locale, string $path, array $defaults): array
    {
        $tr = fn (string $f) => $meta ? (trim((string) $meta->getTranslation($f, $locale, false)) ?: null) : null;

        $title = $tr('meta_title') ?? $defaults['title'];
        $description = $tr('meta_description') ?? $defaults['description'];
        $image = $meta?->og_image ?: $defaults['image'];

        return [
            'title' => $title,
            'description' => $description,
            'keywords' => $tr('keywords'),
            'canonical' => $meta?->canonical_url ?: $this->url($locale, $path),
            'robots' => $meta?->robots ?? 'index,follow',
            'open_graph' => [
                'title' => $tr('og_title') ?? $title,
                'description' => $tr('og_description') ?? $description,
                'image' => $image,
                'type' => $meta?->og_type ?? $defaults['og_type'],
                'locale' => $locale === 'ar' ? 'ar_SY' : 'en_US',
            ],
            'twitter_card' => $meta?->twitter_card ?? 'summary_large_image',
            'alternates' => collect(config('awm.locales'))->mapWithKeys(fn ($l) => [$l => $this->url($l, $path)])->all(),
            'json_ld' => [],
        ];
    }

    /** Sitemap rows. Locale expansion + hreflang alternates are done by Next.js. */
    public function sitemap(): array
    {
        $rows = [];

        foreach (config('awm.static_routes') as $key => $cfg) {
            $meta = SeoMeta::where('route_key', $key)->first();
            if ($meta && ! $meta->in_sitemap) continue;

            $rows[] = [
                'path' => $cfg['path'],
                'lastmod' => $meta?->updated_at?->toAtomString(),
                'changefreq' => $meta?->sitemap_changefreq ?? $cfg['changefreq'],
                'priority' => (float) ($meta?->sitemap_priority ?? $cfg['priority']),
            ];
        }

        foreach ([Vehicle::listed()->with('seo')->get(), SparePart::listed()->with('seo')->get(), Page::published()->with('seo')->get()] as $set) {
            foreach ($set as $m) {
                if ($m->seo && ! $m->seo->in_sitemap) continue;
                $rows[] = [
                    'path' => $m->seoPath(),
                    'lastmod' => $m->updated_at->toAtomString(),
                    'changefreq' => $m->seo?->sitemap_changefreq ?? 'weekly',
                    'priority' => (float) ($m->seo?->sitemap_priority ?? 0.7),
                ];
            }
        }

        return $rows;
    }

    /* ---------------- Write side (admin) ---------------- */

    public function save(array $where, array $data): SeoMeta
    {
        $meta = SeoMeta::firstOrNew($where);

        foreach (['meta_title', 'meta_description', 'keywords', 'og_title', 'og_description'] as $f) {
            if (array_key_exists($f, $data)) {
                $meta->setTranslations($f, array_filter($data[$f] ?? [], fn ($v) => $v !== null && $v !== ''));
            }
        }
        foreach (['og_image', 'og_type', 'twitter_card', 'canonical_url', 'robots', 'schema_overrides', 'in_sitemap', 'sitemap_priority', 'sitemap_changefreq'] as $f) {
            if (array_key_exists($f, $data)) $meta->{$f} = $data[$f];
        }
        $meta->save();

        $this->revalidate();

        return $meta;
    }

    /** Tell Next.js to drop its cached SEO + sitemap data so edits go live immediately. */
    public function revalidate(): void
    {
        try {
            Http::timeout(3)->withHeaders(['x-revalidate-secret' => (string) config('awm.revalidate_secret')])
                ->post(rtrim(config('awm.frontend_url'), '/') . '/api/revalidate', ['tags' => ['seo', 'sitemap']]);
        } catch (\Throwable) {
            // Not fatal: the cache also expires on its own (revalidate: 300).
        }
    }

    private function url(string $locale, string $path): string
    {
        return rtrim(config('awm.frontend_url'), '/') . '/' . $locale . ($path !== '' ? '/' . ltrim($path, '/') : '');
    }

    private function trail(string $locale, string $section, string $leaf, string $leafUrl): array
    {
        return [
            ['name' => config("awm.name.{$locale}"), 'url' => $this->url($locale, '')],
            ['name' => Str::title($section), 'url' => $this->url($locale, $section)],
            ['name' => $leaf, 'url' => $leafUrl],
        ];
    }
}

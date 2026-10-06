<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Page;
use App\Models\SeoMeta;
use App\Models\SparePart;
use App\Models\Vehicle;
use App\Services\Seo\SeoService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SeoAdminController extends Controller
{
    public function __construct(private SeoService $seo) {}

    /** PUT /admin/seo/routes/{key} : home, about, services, contact, vehicles, parts */
    public function updateRoute(Request $request, string $key)
    {
        abort_unless(config("awm.static_routes.{$key}"), 404);

        return $this->seo->save(['route_key' => $key], $this->validated($request));
    }

    /** PUT /admin/seo/{type}/{id} : type = vehicle | spare_part | page */
    public function updateModel(Request $request, string $type, int $id)
    {
        $model = match ($type) {
            'vehicle' => Vehicle::findOrFail($id),
            'spare_part' => SparePart::findOrFail($id),
            'page' => Page::findOrFail($id),
            default => abort(404),
        };

        return $this->seo->save(
            ['seoable_type' => $model->getMorphClass(), 'seoable_id' => $model->getKey()],
            $this->validated($request),
        );
    }

    public function index()
    {
        return SeoMeta::query()->latest('updated_at')->paginate(50);
    }

    /**
     * GET /admin/seo/targets?locale=ar: every public URL with its resolved title/description,
     * plus an audit summary for the KPI strip. Measured from our own data, not from Google.
     */
    public function targets(Request $request)
    {
        $locale = in_array($request->query('locale'), config('awm.locales'), true) ? $request->query('locale') : app()->getLocale();
        $items = [];

        foreach (array_keys(config('awm.static_routes')) as $key) {
            $p = $this->seo->forRoute($key, $locale);
            $items[] = $this->targetRow('route', $key, $p['title'], $p, SeoMeta::where('route_key', $key)->exists());
        }
        foreach ([Vehicle::with('seo')->get(), SparePart::with('seo')->get(), Page::with('seo')->get()] as $set) {
            foreach ($set as $m) {
                $p = $this->seo->forModel($m, $locale);
                $label = $m->getTranslation($m instanceof Page ? 'title' : 'name', $locale);
                $items[] = $this->targetRow($m->getMorphClass(), (string) $m->id, $label, $p, $m->seo !== null);
            }
        }

        $c = collect($items);

        return [
            'summary' => [
                'total' => $c->count(),
                'customised' => $c->where('has_custom', true)->count(),
                'missing_description' => $c->where('description_length', 0)->count(),
                'title_out_of_range' => $c->filter(fn ($i) => $i['title_length'] < 30 || $i['title_length'] > 60)->count(),
                'in_sitemap' => count($this->seo->sitemap()),
            ],
            'items' => $items,
        ];
    }

    /** GET /admin/seo/targets/{type}/{key}: raw translations for the editor + resolved preview per locale. */
    public function showTarget(string $type, string $key)
    {
        if ($type === 'route') {
            abort_unless(config("awm.static_routes.{$key}"), 404);
        }

        [$meta, $preview] = match ($type) {
            'route' => [
                SeoMeta::where('route_key', $key)->first(),
                fn ($l) => $this->seo->forRoute($key, $l),
            ],
            'vehicle', 'spare_part', 'page' => (function () use ($type, $key) {
                $model = ['vehicle' => Vehicle::class, 'spare_part' => SparePart::class, 'page' => Page::class][$type]::with('seo')->findOrFail($key);

                return [$model->seo, fn ($l) => $this->seo->forModel($model, $l)];
            })(),
            default => abort(404),
        };

        $tr = fn ($f) => $meta ? $meta->getTranslations($f) : [];

        return [
            'type' => $type,
            'key' => $key,
            'meta' => [
                'meta_title' => $tr('meta_title'),
                'meta_description' => $tr('meta_description'),
                'keywords' => $tr('keywords'),
                'og_title' => $tr('og_title'),
                'og_description' => $tr('og_description'),
                'og_image' => $meta?->og_image,
                'canonical_url' => $meta?->canonical_url,
                'robots' => $meta?->robots ?? 'index,follow',
                'in_sitemap' => $meta?->in_sitemap ?? true,
                'sitemap_priority' => $meta?->sitemap_priority !== null ? (float) $meta->sitemap_priority : null,
                'sitemap_changefreq' => $meta?->sitemap_changefreq,
            ],
            'preview' => collect(config('awm.locales'))->mapWithKeys(fn ($l) => [$l => $preview($l)]),
        ];
    }

    private function targetRow(string $type, string $key, ?string $label, array $p, bool $custom): array
    {
        return [
            'type' => $type,
            'key' => $key,
            'label' => $label,
            'url' => $p['canonical'],
            'has_custom' => $custom,
            'title' => $p['title'],
            'title_length' => mb_strlen((string) $p['title']),
            'description_length' => mb_strlen((string) $p['description']),
            'robots' => $p['robots'],
        ];
    }

    private function validated(Request $request): array
    {
        $loc = ['nullable', 'array'];

        return $request->validate([
            'meta_title' => $loc, 'meta_title.*' => ['nullable', 'string', 'max:70'],
            'meta_description' => $loc, 'meta_description.*' => ['nullable', 'string', 'max:170'],
            'keywords' => $loc, 'keywords.*' => ['nullable', 'string', 'max:255'],
            'og_title' => $loc, 'og_title.*' => ['nullable', 'string', 'max:95'],
            'og_description' => $loc, 'og_description.*' => ['nullable', 'string', 'max:200'],
            'og_image' => ['nullable', 'string', 'max:500'],
            'og_type' => ['nullable', 'in:website,product,article'],
            'twitter_card' => ['nullable', 'in:summary,summary_large_image'],
            'canonical_url' => ['nullable', 'url', 'max:500'],
            'robots' => ['nullable', Rule::in(['index,follow', 'noindex,follow', 'index,nofollow', 'noindex,nofollow'])],
            'schema_overrides' => ['nullable', 'array'],
            'in_sitemap' => ['nullable', 'boolean'],
            'sitemap_priority' => ['nullable', 'numeric', 'between:0,1'],
            'sitemap_changefreq' => ['nullable', 'in:always,hourly,daily,weekly,monthly,yearly,never'],
        ]);
    }
}

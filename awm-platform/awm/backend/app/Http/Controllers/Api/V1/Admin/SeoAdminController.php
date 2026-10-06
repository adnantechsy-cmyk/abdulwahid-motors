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

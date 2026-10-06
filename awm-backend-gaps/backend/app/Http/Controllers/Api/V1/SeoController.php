<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SparePart;
use App\Models\Vehicle;
use App\Services\Seo\SeoService;

/** Read side of the SEO module. Consumed by Next.js generateMetadata() and app/sitemap.ts. */
class SeoController extends Controller
{
    public function __construct(private SeoService $seo) {}

    /** GET /api/v1/seo/routes/{key}  key: home | about | services | contact | vehicles | parts */
    public function route(string $key)
    {
        return $this->seo->forRoute($key, app()->getLocale());
    }

    /** GET /api/v1/seo/vehicles/{slug} */
    public function vehicle(string $slug)
    {
        $vehicle = Vehicle::listed()->with('seo')->where('slug', $slug)->firstOrFail();

        return $this->seo->forModel($vehicle, app()->getLocale());
    }

    /** GET /api/v1/seo/parts/{slug} */
    public function part(string $slug)
    {
        $part = SparePart::listed()->with('seo')->where('slug', $slug)->firstOrFail();

        return $this->seo->forModel($part, app()->getLocale());
    }

    /** GET /api/v1/seo/sitemap  -> {locales: [...], urls: [{path, lastmod, changefreq, priority}]} */
    public function sitemap()
    {
        return [
            'locales' => config('awm.locales'),
            'urls' => $this->seo->sitemap(),
        ];
    }
}

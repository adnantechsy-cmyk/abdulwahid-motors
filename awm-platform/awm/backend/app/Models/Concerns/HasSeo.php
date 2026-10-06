<?php

namespace App\Models\Concerns;

use App\Models\SeoMeta;
use Illuminate\Database\Eloquent\Relations\MorphOne;

/**
 * For models with their own public URL (Vehicle, SparePart, Page).
 * The admin SEO module writes overrides into seo_metas; SeoService falls back to seoDefaults().
 */
trait HasSeo
{
    public static function bootHasSeo(): void
    {
        // Soft-deleted models keep their SEO row so a restore brings it back.
        static::deleted(function ($model) {
            if (! method_exists($model, 'isForceDeleting') || $model->isForceDeleting()) {
                $model->seo()->delete();
            }
        });
    }

    public function seo(): MorphOne
    {
        return $this->morphOne(SeoMeta::class, 'seoable');
    }

    /** Locale-less path, e.g. "vehicles/seal-awd-2025". */
    abstract public function seoPath(): string;

    /** @return array{title:?string, description:?string, image:?string, og_type:string} */
    abstract public function seoDefaults(string $locale): array;
}

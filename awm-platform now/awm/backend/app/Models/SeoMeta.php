<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Spatie\Translatable\HasTranslations;

class SeoMeta extends Model
{
    use HasTranslations;

    protected $table = 'seo_metas';

    public array $translatable = ['meta_title', 'meta_description', 'keywords', 'og_title', 'og_description'];

    protected $guarded = ['id'];

    protected $casts = [
        'schema_overrides' => 'array',
        'in_sitemap' => 'boolean',
        'sitemap_priority' => 'decimal:1',
    ];

    public function seoable(): MorphTo
    {
        return $this->morphTo();
    }
}

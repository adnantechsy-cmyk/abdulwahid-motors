<?php

namespace App\Models;

use App\Models\Concerns\HasSeo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Spatie\Translatable\HasTranslations;

class Page extends Model
{
    use HasTranslations, HasSeo;

    public array $translatable = ['title', 'excerpt', 'body'];

    protected $guarded = ['id'];

    protected $casts = [
        'sections' => 'array',     // {"vision": {"ar": "...", "en": "..."}, "values": [...]}
        'is_published' => 'boolean',
    ];

    public function scopePublished(Builder $q): Builder
    {
        return $q->where('is_published', true);
    }

    public function seoPath(): string
    {
        return "pages/{$this->slug}";
    }

    public function seoDefaults(string $locale): array
    {
        return [
            'title' => $this->getTranslation('title', $locale),
            'description' => $this->getTranslation('excerpt', $locale) ?: null,
            'image' => null,
            'og_type' => 'article',
        ];
    }
}

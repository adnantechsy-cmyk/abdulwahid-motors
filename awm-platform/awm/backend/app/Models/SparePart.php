<?php

namespace App\Models;

use App\Contracts\Purchasable;
use App\Enums\CartFlow;
use App\Models\Concerns\HasSeo;
use App\Services\Checkout\CheckoutException;
use App\Services\Inventory\StockService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Translatable\HasTranslations;

class SparePart extends Model implements Purchasable
{
    use HasTranslations, HasSeo, SoftDeletes;

    public array $translatable = ['name', 'description'];

    protected $guarded = ['id'];

    protected $casts = [
        'price' => 'decimal:2',
        'is_oem' => 'boolean',
        'is_published' => 'boolean',
        'hide_when_out_of_stock' => 'boolean',
        'compatible_models' => 'array',
        'gallery' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (SparePart $p) {
            $p->slug ??= Str::slug($p->sku);
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function availableQuantity(): int
    {
        return max(0, $this->stock_quantity - $this->reserved_quantity);
    }

    public function isLowStock(): bool
    {
        return $this->availableQuantity() <= $this->low_stock_threshold;
    }

    /** Public listing honours the "auto-hide when out of stock" switch. */
    public function scopeListed(Builder $q): Builder
    {
        return $q->where('is_published', true)
            ->where(fn ($w) => $w->where('hide_when_out_of_stock', false)
                ->orWhereRaw('stock_quantity > reserved_quantity'));
    }

    public function scopeLowStock(Builder $q): Builder
    {
        return $q->whereRaw('(stock_quantity - reserved_quantity) <= low_stock_threshold');
    }

    public function coverUrl(): ?string
    {
        return $this->cover_image ? Storage::disk('public')->url($this->cover_image) : null;
    }

    /* ---------- Purchasable: standard product ---------- */

    public function cartFlow(): CartFlow { return CartFlow::SparePart; }

    public function cartUnitPrice(): string { return (string) $this->price; }

    public function cartCurrency(): string { return $this->currency; }

    public function cartName(): array
    {
        return ['ar' => $this->getTranslation('name', 'ar', false), 'en' => $this->getTranslation('name', 'en', false)];
    }

    public function cartSku(): ?string { return $this->sku; }

    public function cartAvailableQuantity(): int
    {
        return $this->is_published ? $this->availableQuantity() : 0;
    }

    public function cartSnapshot(): array
    {
        return ['image' => $this->coverUrl(), 'slug' => $this->slug, 'max_quantity' => $this->availableQuantity()];
    }

    /** Hold the units so nobody else can buy them while this order awaits payment. */
    public function onOrderPlaced(Order $order, int $quantity): void
    {
        if ($this->availableQuantity() < $quantity) {
            throw new CheckoutException('Insufficient stock.', 'unavailable');
        }
        $this->increment('reserved_quantity', $quantity);
    }

    /** Payment captured: the held units physically leave stock. */
    public function onOrderPaid(Order $order, int $quantity): void
    {
        app(StockService::class)->move($this, -$quantity, 'sale', $order);
        static::whereKey($this->id)->decrement('reserved_quantity', $quantity);
    }

    public function onOrderReleased(Order $order, int $quantity): void
    {
        static::whereKey($this->id)->where('reserved_quantity', '>=', $quantity)->decrement('reserved_quantity', $quantity);
    }

    /* ---------- SEO ---------- */

    public function seoPath(): string { return "parts/{$this->slug}"; }

    public function seoDefaults(string $locale): array
    {
        return [
            'title' => $this->getTranslation('name', $locale),
            'description' => $this->getTranslation('description', $locale) ?: null,
            'image' => $this->coverUrl(),
            'og_type' => 'product',
        ];
    }

    public function toPublicArray(string $locale): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'sku' => $this->sku,
            'name' => $this->getTranslation('name', $locale),
            'description' => $this->getTranslation('description', $locale),
            'category' => $this->category?->toPublicArray($locale),
            'price' => (string) $this->price,
            'currency' => $this->currency,
            'is_oem' => $this->is_oem,
            'compatible_models' => $this->compatible_models,
            'available_quantity' => $this->availableQuantity(),
            'image' => $this->coverUrl(),
            'name_i18n' => $this->cartName(),
        ];
    }
}

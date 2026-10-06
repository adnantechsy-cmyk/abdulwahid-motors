<?php

namespace App\Models;

use App\Contracts\Purchasable;
use App\Enums\CartFlow;
use App\Enums\VehicleStatus;
use App\Models\Concerns\HasSeo;
use App\Services\Checkout\CheckoutException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Translatable\HasTranslations;

class Vehicle extends Model implements Purchasable
{
    use HasTranslations, HasSeo, SoftDeletes;

    public array $translatable = ['name', 'tagline', 'description'];

    protected $guarded = ['id'];

    protected $casts = [
        'status' => VehicleStatus::class,
        'is_published' => 'boolean',
        'price' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
        'specs' => 'array',
        'gallery' => 'array',
        'reserved_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Vehicle $v) {
            $v->slug ??= Str::slug($v->getTranslation('name', 'en', false) . '-' . $v->model_year . '-' . Str::random(4));
        });
    }

    /* ---------- scopes ---------- */

    /** Visible on the public website. Sold cars stay listed (Figma: "show as Sold") */
    public function scopeListed(Builder $q): Builder
    {
        return $q->where('is_published', true);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function coverUrl(): ?string
    {
        return $this->cover_image ? Storage::disk('public')->url($this->cover_image) : null;
    }

    /* ---------- Purchasable: vehicle reservation (deposit) ---------- */

    public function cartFlow(): CartFlow { return CartFlow::VehicleReservation; }

    public function cartUnitPrice(): string { return (string) $this->deposit_amount; }

    public function cartCurrency(): string { return $this->currency; }

    public function cartName(): array
    {
        return ['ar' => $this->getTranslation('name', 'ar', false), 'en' => $this->getTranslation('name', 'en', false)];
    }

    public function cartSku(): ?string { return $this->sku; }

    public function cartAvailableQuantity(): int
    {
        return $this->is_published && $this->status === VehicleStatus::Available ? 1 : 0;
    }

    public function cartSnapshot(): array
    {
        return ['image' => $this->coverUrl(), 'vehicle_price' => (string) $this->price, 'year' => $this->model_year, 'slug' => $this->slug];
    }

    public function onOrderPlaced(Order $order, int $quantity): void
    {
        if ($this->status !== VehicleStatus::Available) {
            throw new CheckoutException('Vehicle is no longer available.', 'unavailable');
        }
        $this->update(['status' => VehicleStatus::Reserved, 'reserved_order_id' => $order->id, 'reserved_at' => now()]);
    }

    public function onOrderPaid(Order $order, int $quantity): void
    {
        // Deposit received: the car stays Reserved (Sales moves it to Sold after full payment)
        // and its pre-delivery inspection starts, so the customer can follow it on the tracking page.
        app(\App\Services\Pdi\PdiService::class)->openForOrder($order, $this);
    }

    public function onOrderReleased(Order $order, int $quantity): void
    {
        if ($this->reserved_order_id === $order->id) {
            $this->update(['status' => VehicleStatus::Available, 'reserved_order_id' => null, 'reserved_at' => null]);
        }
    }

    /* ---------- SEO ---------- */

    public function seoPath(): string { return "vehicles/{$this->slug}"; }

    public function seoDefaults(string $locale): array
    {
        return [
            'title' => $this->getTranslation('name', $locale) . ' ' . $this->model_year,
            'description' => $this->getTranslation('description', $locale) ?: null,
            'image' => $this->coverUrl(),
            'og_type' => 'product',
        ];
    }

    /** Shape returned by the public catalogue API. */
    public function toPublicArray(string $locale): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->getTranslation('name', $locale),
            'tagline' => $this->getTranslation('tagline', $locale),
            'description' => $this->getTranslation('description', $locale),
            'model_year' => $this->model_year,
            'body_type' => $this->body_type,
            'powertrain' => $this->powertrain,
            'specs' => $this->specs,
            'price' => (string) $this->price,
            'deposit_amount' => (string) $this->deposit_amount,
            'currency' => $this->currency,
            'status' => $this->status->value,
            'branch' => $this->branch,
            'category' => $this->category?->toPublicArray($locale),
            'image' => $this->coverUrl(),
            'gallery' => collect($this->gallery ?? [])->map(fn ($p) => Storage::disk('public')->url($p))->all(),
            'name_i18n' => $this->cartName(),
        ];
    }
}

<?php

namespace App\Providers;

use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(\App\Services\Payments\PaymentManager::class);
    }

    public function boot(): void
    {
        // Stable aliases in cart_items / order_items / seo_metas / stock_movements instead of class names.
        // enforceMorphMap throws if a model is used polymorphically without an alias, so every
        // model that can be a morph target must be listed (StockService references Order and JobCard).
        Relation::enforceMorphMap([
            'spare_part' => \App\Models\SparePart::class,
            'vehicle' => \App\Models\Vehicle::class,
            'maintenance_invoice' => \App\Models\MaintenanceInvoice::class,
            'page' => \App\Models\Page::class,
            'user' => \App\Models\User::class,
            'order' => \App\Models\Order::class,
            'job_card' => \App\Models\JobCard::class,
        ]);
    }
}

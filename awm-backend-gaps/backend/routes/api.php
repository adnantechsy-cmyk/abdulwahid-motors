<?php

use App\Http\Controllers\Api\V1\Admin\SeoAdminController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\CheckoutController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\SeoController;
use App\Http\Middleware\SetApiLocale;
use App\Http\Middleware\UseSanctumGuard;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware([SetApiLocale::class, UseSanctumGuard::class])->group(function () {
    // ---- Public catalogue + SEO (read by Next.js SSR) ----
    Route::get('vehicles', [CatalogController::class, 'vehicles']);
    Route::get('vehicles/{slug}', [CatalogController::class, 'vehicle']);
    Route::get('parts', [CatalogController::class, 'parts']);
    Route::get('parts/{slug}', [CatalogController::class, 'part']);

    Route::prefix('seo')->group(function () {
        Route::get('routes/{key}', [SeoController::class, 'route']);
        Route::get('vehicles/{slug}', [SeoController::class, 'vehicle']);
        Route::get('parts/{slug}', [SeoController::class, 'part']);
        Route::get('sitemap', [SeoController::class, 'sitemap']);
    });

    // ---- Cart + checkout: guests (X-Cart-Token) or logged-in users (optional Bearer token) ----
    Route::put('cart', [CartController::class, 'sync']);
    Route::post('checkout', [CheckoutController::class, 'store'])->middleware('throttle:10,1');

    Route::get('orders/{number}/payment-methods', [PaymentController::class, 'methods']);
    Route::post('orders/{number}/pay', [PaymentController::class, 'pay'])->middleware('throttle:20,1');
    Route::post('payments/{uuid}/proof', [PaymentController::class, 'uploadProof'])->middleware('throttle:10,1');

    // Gateways call this directly: no auth, signature verified in the driver.
    Route::post('webhooks/{gateway}', [PaymentController::class, 'webhook']);

    // ---- Admin ----
    Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
        Route::middleware('permission:payments.confirm')->group(function () {
            Route::post('payments/{uuid}/confirm', [PaymentController::class, 'confirm']);
            Route::post('payments/{uuid}/reject', [PaymentController::class, 'reject']);
        });

        Route::middleware('permission:seo.manage')->group(function () {
            Route::get('seo', [SeoAdminController::class, 'index']);
            Route::put('seo/routes/{key}', [SeoAdminController::class, 'updateRoute']);
            Route::put('seo/{type}/{id}', [SeoAdminController::class, 'updateModel'])->where('id', '[0-9]+');
        });
    });
});

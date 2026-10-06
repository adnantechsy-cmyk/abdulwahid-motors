<?php

use App\Http\Controllers\Api\V1\Account\AccountController;
use App\Http\Controllers\Api\V1\ContactController;
use App\Http\Controllers\Api\V1\Admin\AdminSummaryController;
use App\Http\Controllers\Api\V1\Admin\AppointmentAdminController;
use App\Http\Controllers\Api\V1\Admin\BatteryInspectionAdminController;
use App\Http\Controllers\Api\V1\Admin\CategoryAdminController;
use App\Http\Controllers\Api\V1\Admin\JobCardAdminController;
use App\Http\Controllers\Api\V1\Admin\OrderAdminController;
use App\Http\Controllers\Api\V1\Admin\PartAdminController;
use App\Http\Controllers\Api\V1\Admin\VehicleAdminController;
use App\Http\Controllers\Api\V1\Admin\PaymentAdminController;
use App\Http\Controllers\Api\V1\Admin\PdiAdminController;
use App\Http\Controllers\Api\V1\Admin\SeoAdminController;
use App\Http\Controllers\Api\V1\AppointmentController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\CertificateController;
use App\Http\Controllers\Api\V1\CheckoutController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\SeoController;
use App\Http\Middleware\SetApiLocale;
use App\Http\Middleware\UseSanctumGuard;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware([SetApiLocale::class, UseSanctumGuard::class])->group(function () {
    // ---- Auth ----
    Route::prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register'])->middleware('throttle:5,1');
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');
        Route::middleware('auth:sanctum')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
        });
    });

    // ---- Public catalogue + SEO (read by Next.js SSR) ----
    Route::get('categories', [CatalogController::class, 'categories']);
    Route::get('vehicles', [CatalogController::class, 'vehicles']);
    Route::get('vehicles/{slug}', [CatalogController::class, 'vehicle']);
    Route::get('parts', [CatalogController::class, 'parts']);
    Route::get('parts/{slug}', [CatalogController::class, 'part']);
    Route::get('certificates/{code}', [CertificateController::class, 'show'])->middleware('throttle:30,1');

    Route::prefix('seo')->group(function () {
        Route::get('routes/{key}', [SeoController::class, 'route']);
        Route::get('vehicles/{slug}', [SeoController::class, 'vehicle']);
        Route::get('parts/{slug}', [SeoController::class, 'part']);
        Route::get('sitemap', [SeoController::class, 'sitemap']);
    });

    // ---- Appointments (guests or customers) ----
    Route::get('appointments/slots', [AppointmentController::class, 'slots']);
    Route::post('appointments', [AppointmentController::class, 'store'])->middleware('throttle:5,1');
    Route::post('contact', [ContactController::class, 'store'])->middleware('throttle:5,1');

    // ---- Cart + checkout: guests (X-Cart-Token) or logged-in users (optional Bearer token) ----
    Route::put('cart', [CartController::class, 'sync']);
    Route::post('checkout', [CheckoutController::class, 'store'])->middleware('throttle:10,1');

    Route::get('orders/{number}/payment-methods', [PaymentController::class, 'methods']);
    Route::post('orders/{number}/pay', [PaymentController::class, 'pay'])->middleware('throttle:20,1');
    Route::post('payments/{uuid}/proof', [PaymentController::class, 'uploadProof'])->middleware('throttle:10,1');

    // Gateways call this directly: no auth, signature verified in the driver.
    Route::post('webhooks/{gateway}', [PaymentController::class, 'webhook']);

    // ---- Customer account ----
    Route::prefix('account')->middleware('auth:sanctum')->group(function () {
        Route::get('summary', [AccountController::class, 'summary']);
        Route::get('orders', [AccountController::class, 'orders']);
        Route::get('orders/{number}', [AccountController::class, 'order']);
        Route::get('vehicles', [AccountController::class, 'vehicles']);
        Route::get('vehicles/{id}', [AccountController::class, 'vehicle'])->whereNumber('id');
        Route::get('invoices', [AccountController::class, 'invoices']);
        Route::get('battery-reports/{certificate}', [AccountController::class, 'batteryReport']);
        Route::get('appointments', [AppointmentController::class, 'mine']);
        Route::post('appointments/{number}/cancel', [AppointmentController::class, 'cancel']);
    });

    // ---- Admin ----
    Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
        Route::get('summary', AdminSummaryController::class)->middleware('permission:dashboard.view');

        Route::middleware('permission:payments.confirm')->group(function () {
            Route::get('payments', [PaymentAdminController::class, 'index']);
            Route::get('payments/{uuid}/proof', [PaymentAdminController::class, 'proof']);
            Route::post('payments/{uuid}/confirm', [PaymentController::class, 'confirm']);
            Route::post('payments/{uuid}/reject', [PaymentController::class, 'reject']);
        });

        // Workshop board: technicians work cards, only job_cards.manage can assign them.
        Route::middleware('permission:job_cards.work|job_cards.manage')->group(function () {
            Route::get('job-cards', [JobCardAdminController::class, 'index']);
            Route::get('technicians', [JobCardAdminController::class, 'technicians']);
            Route::put('job-cards/{card}/status', [JobCardAdminController::class, 'status']);
            Route::post('job-cards/{card}/complete', [JobCardAdminController::class, 'complete']);
            Route::put('job-cards/{card}/technician', [JobCardAdminController::class, 'assign'])->middleware('permission:job_cards.manage');
        });

        Route::middleware('permission:orders.manage')->group(function () {
            Route::get('orders', [OrderAdminController::class, 'index']);
            Route::get('orders/{number}', [OrderAdminController::class, 'show']);
            Route::post('orders/{number}/payment', [OrderAdminController::class, 'recordPayment']);
            Route::put('orders/{number}/status', [OrderAdminController::class, 'status']);
            Route::post('orders/{number}/cancel', [OrderAdminController::class, 'cancel']);
        });
        Route::middleware('permission:vehicles.manage')->group(function () {
            Route::get('vehicles', [VehicleAdminController::class, 'index']);
            Route::get('vehicle-categories', [VehicleAdminController::class, 'categories']);
            Route::post('vehicles', [VehicleAdminController::class, 'store']);
            Route::get('vehicles/{vehicle}', [VehicleAdminController::class, 'show'])->whereNumber('vehicle');
            Route::put('vehicles/{vehicle}', [VehicleAdminController::class, 'update'])->whereNumber('vehicle');
            Route::post('vehicles/{vehicle}/brochure', [VehicleAdminController::class, 'uploadBrochure'])->whereNumber('vehicle')->middleware('throttle:30,1');
            Route::delete('vehicles/{vehicle}/brochure', [VehicleAdminController::class, 'deleteBrochure'])->whereNumber('vehicle');
            Route::post('vehicles/{vehicle}/cover', [VehicleAdminController::class, 'uploadCover'])->whereNumber('vehicle')->middleware('throttle:30,1');
        });
        Route::middleware('permission:parts.manage|stock.adjust')->group(function () {
            Route::get('parts', [PartAdminController::class, 'index']);
            Route::get('part-categories', [PartAdminController::class, 'categories']);
            Route::get('parts/{part}', [PartAdminController::class, 'show'])->whereNumber('part');
            Route::get('parts/{part}/movements', [PartAdminController::class, 'movements'])->whereNumber('part');
            Route::post('parts/{part}/stock', [PartAdminController::class, 'adjust'])->whereNumber('part')->middleware('permission:stock.adjust');
        });
        Route::middleware('permission:parts.manage')->group(function () {
            Route::post('parts', [PartAdminController::class, 'store']);
            Route::put('parts/{part}', [PartAdminController::class, 'update'])->whereNumber('part');
            Route::post('parts/{part}/cover', [PartAdminController::class, 'uploadCover'])->whereNumber('part')->middleware('throttle:30,1');
        });
        Route::middleware('permission:seo.manage')->group(function () {
            Route::get('seo', [SeoAdminController::class, 'index']);
            Route::put('seo/routes/{key}', [SeoAdminController::class, 'updateRoute']);
            Route::put('seo/{type}/{id}', [SeoAdminController::class, 'updateModel'])->where('id', '[0-9]+');
        });

        Route::middleware('permission:categories.manage')->group(function () {
            Route::get('categories', [CategoryAdminController::class, 'index']);
            Route::post('categories', [CategoryAdminController::class, 'store']);
            Route::put('categories/{category}', [CategoryAdminController::class, 'update']);
            Route::delete('categories/{category}', [CategoryAdminController::class, 'destroy']);
        });

        Route::middleware('permission:pdi.manage')->group(function () {
            Route::get('pdi', [PdiAdminController::class, 'index']);
            Route::get('pdi/{pdi}', [PdiAdminController::class, 'show']);
            Route::put('pdi/{pdi}', [PdiAdminController::class, 'update']);
            Route::post('pdi/{pdi}/start', [PdiAdminController::class, 'start']);
            Route::put('pdi/items/{item}', [PdiAdminController::class, 'checkItem']);
            Route::post('pdi/{pdi}/complete', [PdiAdminController::class, 'complete']);
            Route::post('pdi/{pdi}/deliver', [PdiAdminController::class, 'deliver'])->middleware('permission:orders.manage');
        });

        Route::middleware('permission:battery.inspect')->group(function () {
            Route::get('battery-inspections', [BatteryInspectionAdminController::class, 'index']);
            Route::post('customer-vehicles/{vehicle}/battery-inspections', [BatteryInspectionAdminController::class, 'store']);
            Route::post('battery-inspections/{report}/revoke', [BatteryInspectionAdminController::class, 'revoke']);
        });

        Route::middleware('permission:appointments.manage')->group(function () {
            Route::get('appointments', [AppointmentAdminController::class, 'index']);
            Route::put('appointments/{appointment}', [AppointmentAdminController::class, 'update']);
            Route::post('appointments/{appointment}/confirm', [AppointmentAdminController::class, 'confirm']);
            Route::post('appointments/{appointment}/cancel', [AppointmentAdminController::class, 'cancel']);
            Route::post('appointments/{appointment}/no-show', [AppointmentAdminController::class, 'noShow']);
            Route::post('appointments/{appointment}/check-in', [AppointmentAdminController::class, 'checkIn']);
        });
    });
});

<?php

use App\Http\Controllers\Api\V1\Account\AccountController;
use App\Http\Controllers\Api\V1\Admin\AppointmentAdminController;
use App\Http\Controllers\Api\V1\Admin\CustomerAdminController;
use App\Http\Controllers\Api\V1\Admin\DashboardController;
use App\Http\Controllers\Api\V1\Admin\InvoiceAdminController;
use App\Http\Controllers\Api\V1\Admin\JobCardAdminController;
use App\Http\Controllers\Api\V1\Admin\OrderAdminController;
use App\Http\Controllers\Api\V1\Admin\PageAdminController;
use App\Http\Controllers\Api\V1\Admin\SettingsAdminController;
use App\Http\Controllers\Api\V1\Admin\SparePartAdminController;
use App\Http\Controllers\Api\V1\Admin\StaffAdminController;
use App\Http\Controllers\Api\V1\Admin\VehicleAdminController;
use App\Http\Controllers\Api\V1\Admin\BatteryInspectionAdminController;
use App\Http\Controllers\Api\V1\Admin\CategoryAdminController;
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
use App\Http\Controllers\Api\V1\SiteController;
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
    Route::get('settings', [SiteController::class, 'settings']);
    Route::get('pages/{slug}', [SiteController::class, 'page']);

    Route::prefix('seo')->group(function () {
        Route::get('routes/{key}', [SeoController::class, 'route']);
        Route::get('vehicles/{slug}', [SeoController::class, 'vehicle']);
        Route::get('parts/{slug}', [SeoController::class, 'part']);
        Route::get('pages/{slug}', [SeoController::class, 'page']);
        Route::get('sitemap', [SeoController::class, 'sitemap']);
    });

    // ---- Appointments (guests or customers) ----
    Route::get('appointments/slots', [AppointmentController::class, 'slots']);
    Route::post('appointments', [AppointmentController::class, 'store'])->middleware('throttle:5,1');

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
        Route::get('dashboard', DashboardController::class)->middleware('permission:dashboard.view');

        Route::middleware('permission:vehicles.manage')->group(function () {
            Route::get('vehicles', [VehicleAdminController::class, 'index']);
            Route::post('vehicles', [VehicleAdminController::class, 'store']);
            Route::get('vehicles/{vehicle}', [VehicleAdminController::class, 'show']);
            Route::put('vehicles/{vehicle}', [VehicleAdminController::class, 'update']);
            Route::delete('vehicles/{vehicle}', [VehicleAdminController::class, 'destroy']);
            Route::put('vehicles/{vehicle}/status', [VehicleAdminController::class, 'setStatus']);
            Route::put('vehicles/{vehicle}/visibility', [VehicleAdminController::class, 'setVisibility']);
            Route::post('vehicles/{vehicle}/images', [VehicleAdminController::class, 'uploadImages']);
            Route::put('vehicles/{vehicle}/gallery', [VehicleAdminController::class, 'updateGallery']);
        });

        Route::middleware('permission:parts.manage|stock.adjust')->group(function () {
            Route::get('parts', [SparePartAdminController::class, 'index']);
            Route::get('parts/{part}', [SparePartAdminController::class, 'show']);
            Route::get('parts/{part}/movements', [SparePartAdminController::class, 'movements']);
        });
        Route::middleware('permission:parts.manage')->group(function () {
            Route::post('parts', [SparePartAdminController::class, 'store']);
            Route::put('parts/{part}', [SparePartAdminController::class, 'update']);
            Route::delete('parts/{part}', [SparePartAdminController::class, 'destroy']);
            Route::post('parts/{part}/image', [SparePartAdminController::class, 'uploadImage']);
        });
        Route::post('parts/{part}/stock', [SparePartAdminController::class, 'adjustStock'])->middleware('permission:stock.adjust');

        Route::middleware('permission:job_cards.manage|job_cards.work')->group(function () {
            Route::get('job-cards', [JobCardAdminController::class, 'index']);
            Route::get('job-cards/{jobCard}', [JobCardAdminController::class, 'show']);
            Route::put('job-cards/{jobCard}', [JobCardAdminController::class, 'update']);
            Route::post('job-cards/{jobCard}/parts', [JobCardAdminController::class, 'usePart']);
            Route::delete('job-cards/{jobCard}/parts/{line}', [JobCardAdminController::class, 'returnPart']);
            Route::post('job-cards/{jobCard}/complete', [JobCardAdminController::class, 'complete']);
            Route::get('parts-lookup', [SparePartAdminController::class, 'index']);   // technicians search parts to fit
        });
        Route::middleware('permission:job_cards.manage')->group(function () {
            Route::post('job-cards', [JobCardAdminController::class, 'store']);
            Route::get('technicians', [JobCardAdminController::class, 'technicians']);
        });

        Route::middleware('permission:customers.manage')->group(function () {
            Route::get('customers', [CustomerAdminController::class, 'index']);
            Route::post('customers', [CustomerAdminController::class, 'store']);
            Route::get('customers/{customer}', [CustomerAdminController::class, 'show'])->whereNumber('customer');
            Route::put('customers/{customer}', [CustomerAdminController::class, 'update'])->whereNumber('customer');
            Route::post('customers/{customer}/vehicles', [CustomerAdminController::class, 'storeVehicle'])->whereNumber('customer');
            Route::put('customer-vehicles/{vehicle}', [CustomerAdminController::class, 'updateVehicle']);
        });

        Route::middleware('permission:invoices.manage')->group(function () {
            Route::get('invoices', [InvoiceAdminController::class, 'index']);
            Route::get('invoices/{invoice}', [InvoiceAdminController::class, 'show']);
            Route::post('invoices/{invoice}/payments', [InvoiceAdminController::class, 'recordPayment']);
            Route::post('invoices/{invoice}/void', [InvoiceAdminController::class, 'void']);
        });

        Route::middleware('permission:orders.manage')->group(function () {
            Route::get('orders', [OrderAdminController::class, 'index']);
            Route::get('orders/{order}', [OrderAdminController::class, 'show']);
            Route::put('orders/{order}/status', [OrderAdminController::class, 'updateStatus']);
            Route::post('orders/{order}/cancel', [OrderAdminController::class, 'cancel']);
        });

        Route::middleware('permission:payments.confirm')->group(function () {
            Route::get('payments', [OrderAdminController::class, 'payments']);
            Route::get('payments/{uuid}/proof', [OrderAdminController::class, 'proof']);
        });

        Route::middleware('permission:pages.manage')->group(function () {
            Route::get('pages', [PageAdminController::class, 'index']);
            Route::post('pages', [PageAdminController::class, 'store']);
            Route::get('pages/{page}', [PageAdminController::class, 'show']);
            Route::put('pages/{page}', [PageAdminController::class, 'update']);
            Route::delete('pages/{page}', [PageAdminController::class, 'destroy']);
        });

        Route::middleware('permission:settings.manage')->group(function () {
            Route::get('settings', [SettingsAdminController::class, 'index']);
            Route::put('settings', [SettingsAdminController::class, 'update']);
            Route::get('payment-gateways', [SettingsAdminController::class, 'gateways']);
            Route::put('payment-gateways/{gateway}', [SettingsAdminController::class, 'updateGateway']);
        });

        Route::middleware('permission:users.manage')->group(function () {
            Route::get('staff', [StaffAdminController::class, 'index']);
            Route::post('staff', [StaffAdminController::class, 'store']);
            Route::put('staff/{staff}', [StaffAdminController::class, 'update']);
        });
        Route::middleware('permission:payments.confirm')->group(function () {
            Route::post('payments/{uuid}/confirm', [PaymentController::class, 'confirm']);
            Route::post('payments/{uuid}/reject', [PaymentController::class, 'reject']);
        });

        Route::middleware('permission:seo.manage')->group(function () {
            Route::get('seo', [SeoAdminController::class, 'index']);
            Route::get('seo/targets', [SeoAdminController::class, 'targets']);
            Route::get('seo/targets/{type}/{key}', [SeoAdminController::class, 'showTarget']);
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

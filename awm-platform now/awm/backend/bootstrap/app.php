<?php

use App\Services\Checkout\CheckoutException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);

        // Hostinger (and its CDN) sit in front of PHP: trust the proxy headers so
        // URLs, HTTPS detection and rate limiting use the real client.
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Any CheckoutException that escapes a controller becomes a clean 422.
        $exceptions->render(function (CheckoutException $e, Request $request) {
            return response()->json(['message' => $e->getMessage(), 'code' => $e->errorCode], 422);
        });

        // The API always answers JSON, even for 404s and validation errors.
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());
    })
    ->create();

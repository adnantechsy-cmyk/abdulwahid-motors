<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Picks the response language for spatie/laravel-translatable.
 * Priority: ?locale=  >  X-Locale header (sent by Next.js)  >  Accept-Language  >  config default.
 */
class SetApiLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $supported = config('awm.locales', ['ar', 'en']);

        $locale = collect([
            $request->query('locale'),
            $request->header('X-Locale'),
            $request->getPreferredLanguage($supported),
        ])->first(fn ($l) => is_string($l) && in_array($l, $supported, true))
            ?? config('app.locale', 'ar');

        app()->setLocale($locale);

        $response = $next($request);
        $response->headers->set('Content-Language', $locale);
        $response->headers->set('Vary', trim($response->headers->get('Vary', '') . ', X-Locale, Accept-Language', ', '));

        return $response;
    }
}

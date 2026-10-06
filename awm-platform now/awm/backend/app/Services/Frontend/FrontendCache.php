<?php

namespace App\Services\Frontend;

use Illuminate\Support\Facades\Http;

/**
 * Tells Next.js to drop cached data after an admin edit (POST /api/revalidate).
 * Runs after the response is sent, so a slow or sleeping frontend never delays the admin panel.
 * Tags must be allowed in frontend/src/app/api/revalidate/route.ts.
 */
class FrontendCache
{
    public static function purge(string ...$tags): void
    {
        $tags = array_values(array_unique($tags));

        dispatch(function () use ($tags) {
            try {
                Http::timeout(5)
                    ->withHeaders(['x-revalidate-secret' => (string) config('awm.revalidate_secret')])
                    ->post(rtrim(config('awm.frontend_url'), '/') . '/api/revalidate', ['tags' => $tags]);
            } catch (\Throwable) {
                // Not fatal: cached pages also expire on their own (revalidate: 300).
            }
        })->afterResponse();
    }
}

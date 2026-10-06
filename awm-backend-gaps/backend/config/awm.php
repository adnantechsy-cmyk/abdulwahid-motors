<?php

/*
| Abdul Wahid Motors: business settings used by SEO, JSON-LD, checkout and the revalidation hook.
*/

return [
    'name' => [
        'ar' => 'شركة عبد الواحد موتورز',
        'en' => 'Abdul Wahid Motors',
    ],

    'brand' => 'BYD',

    'locales' => ['ar', 'en'],

    'default_currency' => env('AWM_DEFAULT_CURRENCY', 'USD'),

    // Public Next.js site. Used for canonical URLs, JSON-LD @id and the /api/revalidate call.
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),

    // Must equal REVALIDATE_SECRET in the Next.js environment.
    'revalidate_secret' => env('REVALIDATE_SECRET'),

    'branches' => [
        'sahnaya' => [
            'name' => ['ar' => 'عبد الواحد موتورز - فرع صحنايا', 'en' => 'Abdul Wahid Motors - Sahnaya Branch'],
            'street' => ['ar' => 'أوتوستراد صحنايا، بالقرب من شركة زينة', 'en' => 'Sahnaya Highway, near Zaina Co.'],
            'city' => ['ar' => 'دمشق', 'en' => 'Damascus'],
        ],
        'kafr_sousa' => [
            'name' => ['ar' => 'عبد الواحد موتورز - فرع كفرسوسة', 'en' => 'Abdul Wahid Motors - Kafr Sousa Branch'],
            'street' => ['ar' => 'كفرسوسة، بالقرب من مطعم زمان', 'en' => 'Kafr Sousa, near Zaman Restaurant'],
            'city' => ['ar' => 'دمشق', 'en' => 'Damascus'],
        ],
    ],

    // Code-defined public pages. The admin SEO module edits these via seo_metas.route_key.
    'static_routes' => [
        'home' => ['path' => '', 'priority' => 1.0, 'changefreq' => 'weekly'],
        'about' => ['path' => 'about', 'priority' => 0.6, 'changefreq' => 'monthly'],
        'services' => ['path' => 'services', 'priority' => 0.8, 'changefreq' => 'monthly'],
        'contact' => ['path' => 'contact', 'priority' => 0.6, 'changefreq' => 'yearly'],
        'vehicles' => ['path' => 'vehicles', 'priority' => 0.9, 'changefreq' => 'daily'],
        'parts' => ['path' => 'parts', 'priority' => 0.8, 'changefreq' => 'daily'],
    ],
];

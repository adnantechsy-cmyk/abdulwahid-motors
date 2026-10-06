<?php

return [
    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Comma-separated, e.g. "https://abdulwahidmotors.com,https://www.abdulwahidmotors.com"
    'allowed_origins' => array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', env('FRONTEND_URL', 'http://localhost:3000'))))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With', 'X-Cart-Token', 'X-Locale', 'X-Customer-Phone', 'Idempotency-Key'],

    // The browser must be able to read the guest cart token the API hands back.
    'exposed_headers' => ['X-Cart-Token', 'Content-Language'],

    'max_age' => 86400,

    // Bearer tokens, not cookies.
    'supports_credentials' => false,
];

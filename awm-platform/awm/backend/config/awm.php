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

    // Where the website's contact form delivers, by the topic the visitor picked.
    'contact' => [
        'recipients' => [
            'info' => env('AWM_MAIL_INFO', 'info@abdulwahidmotors.com'),
            'sales' => env('AWM_MAIL_SALES', 'sales@abdulwahidmotors.com'),
            'parts' => env('AWM_MAIL_PARTS', 'parts@abdulwahidmotors.com'),
            'management' => env('AWM_MAIL_MANAGEMENT', 'management@abdulwahidmotors.com'),
        ],
    ],

    // "Sign in with Google": the OAuth Web client ID from Google Cloud Console (same value as NEXT_PUBLIC_GOOGLE_CLIENT_ID).
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
    ],

    // Two-factor login (authenticator app) for staff. On: staff without it can only open the security screen until they set it up.
    'two_factor' => [
        'required' => (bool) env('AWM_2FA_REQUIRED', true),
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

    // Warranty recorded when a car is delivered into a customer's fleet. Set to the terms you actually offer.
    'warranty_years' => (int) env('AWM_WARRANTY_YEARS', 6),

    /*
    | Service appointments (times are Asia/Damascus). A day missing from "hours" is closed.
    */
    'appointments' => [
        'slot_minutes' => 60,
        'capacity_per_slot' => (int) env('AWM_APPOINTMENT_CAPACITY', 3),   // per branch, per slot
        'min_lead_hours' => 2,
        'max_days_ahead' => 30,
        'hours' => [
            'saturday' => ['09:00', '17:00'],
            'sunday' => ['09:00', '17:00'],
            'monday' => ['09:00', '17:00'],
            'tuesday' => ['09:00', '17:00'],
            'wednesday' => ['09:00', '17:00'],
            'thursday' => ['09:00', '15:00'],
            // 'friday' => closed
        ],
    ],

    /*
    | Blade battery certificates. Thresholds grade state of health (%) when the technician
    | doesn't set a result explicitly.
    */
    'battery' => [
        'pass_min_soh' => 85,
        'attention_min_soh' => 70,
        'validity_months' => 6,
    ],

    'pdi' => [
        'default_days' => 3,          // initial estimated delivery shown to the customer
    ],

    /*
    | Pre-delivery inspection template, copied into each new inspection.
    | section => [code => {ar, en}]. Edit freely; past inspections keep their own copy.
    */
    'pdi_checklist' => [
        'documents' => [
            'vin_match' => ['ar' => 'مطابقة رقم الهيكل مع الأوراق', 'en' => 'VIN matches documents'],
            'manuals_keys' => ['ar' => 'دليل المالك والمفاتيح (2)', 'en' => 'Owner manual and both keys'],
        ],
        'exterior' => [
            'paint_body' => ['ar' => 'الطلاء والهيكل بدون خدوش أو صدمات', 'en' => 'Paint and body free of scratches or dents'],
            'glass_lights' => ['ar' => 'الزجاج والأضواء', 'en' => 'Glass and lights'],
            'tyres_pressure' => ['ar' => 'الإطارات وضغط الهواء', 'en' => 'Tyres and pressure'],
        ],
        'interior' => [
            'cabin_condition' => ['ar' => 'حالة المقصورة والمقاعد', 'en' => 'Cabin and seats condition'],
            'ac_climate' => ['ar' => 'التكييف والتحكم بالمناخ', 'en' => 'Air conditioning and climate control'],
            'infotainment' => ['ar' => 'شاشة الوسائط والكاميرات', 'en' => 'Infotainment screen and cameras'],
        ],
        'battery' => [
            'hv_battery_soh' => ['ar' => 'صحة بطارية Blade وعدم وجود أعطال', 'en' => 'Blade battery health, no fault codes'],
            'charge_port' => ['ar' => 'منفذ الشحن والشحن التجريبي', 'en' => 'Charge port and test charge'],
            'charge_level' => ['ar' => 'مستوى الشحن عند التسليم ≥ 80%', 'en' => 'Charge level at handover ≥ 80%'],
        ],
        'systems' => [
            'diagnostics_scan' => ['ar' => 'فحص إلكتروني كامل بدون أكواد أعطال', 'en' => 'Full electronic scan, no fault codes'],
            'software_update' => ['ar' => 'تحديث البرمجيات لآخر إصدار', 'en' => 'Software updated to latest version'],
            'brakes_12v' => ['ar' => 'المكابح وبطارية 12 فولت', 'en' => 'Brakes and 12V battery'],
        ],
        'road_test' => [
            'test_drive' => ['ar' => 'تجربة قيادة بدون أصوات أو اهتزازات', 'en' => 'Road test, no noises or vibration'],
            'final_wash' => ['ar' => 'غسيل وتجهيز نهائي', 'en' => 'Final wash and preparation'],
        ],
    ],
];

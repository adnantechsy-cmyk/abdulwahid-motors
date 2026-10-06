<?php

namespace Database\Seeders;

use App\Models\SeoMeta;
use Illuminate\Database\Seeder;

/** Starter meta text for the six static routes. Never overwrites admin edits. */
class SeoSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            'home' => [
                'meta_title' => ['ar' => 'عبد الواحد موتورز | وكيل BYD في دمشق', 'en' => 'Abdul Wahid Motors | BYD Dealer in Damascus'],
                'meta_description' => [
                    'ar' => '16 عاماً من الثقة في سوريا. بيع سيارات BYD الكهربائية والهجينة، صيانة شاملة، فحص إلكتروني وقطع غيار أصلية في فرعي صحنايا وكفرسوسة.',
                    'en' => '16 years of trust in Syria. BYD electric and hybrid cars, full maintenance, electronic diagnostics and genuine parts at our Sahnaya and Kafr Sousa branches.',
                ],
            ],
            'about' => [
                'meta_title' => ['ar' => 'من نحن | عبد الواحد موتورز', 'en' => 'About Us | Abdul Wahid Motors'],
                'meta_description' => [
                    'ar' => 'قصة عبد الواحد موتورز: رؤيتنا أن نكون شبكة BYD الأكثر موثوقية في سوريا، ورسالتنا تجربة متكاملة من البيع المسؤول إلى الخدمة الفنية.',
                    'en' => 'Our story: we aim to be the most reliable BYD network in Syria, with an integrated experience from responsible sales to technical service.',
                ],
            ],
            'services' => [
                'meta_title' => ['ar' => 'منظومة الخدمات | عبد الواحد موتورز', 'en' => 'Our Services | Abdul Wahid Motors'],
                'meta_description' => [
                    'ar' => 'بيع السيارات، الكفالات، كادر فني مدرّب، صيانة شاملة، فحص إلكتروني، قطع غيار وخدمات ما بعد البيع لسيارات BYD.',
                    'en' => 'Car sales, warranties, trained technicians, full maintenance, electronic diagnostics, spare parts and after-sales service for BYD vehicles.',
                ],
            ],
            'contact' => [
                'meta_title' => ['ar' => 'تواصل معنا وفروعنا | عبد الواحد موتورز', 'en' => 'Contact & Branches | Abdul Wahid Motors'],
                'meta_description' => [
                    'ar' => 'زورونا في فرع أوتوستراد صحنايا أو فرع كفرسوسة في دمشق.',
                    'en' => 'Visit us at our Sahnaya Highway or Kafr Sousa branches in Damascus.',
                ],
            ],
            'vehicles' => [
                'meta_title' => ['ar' => 'سيارات BYD للبيع في سوريا | عبد الواحد موتورز', 'en' => 'BYD Cars for Sale in Syria | Abdul Wahid Motors'],
                'meta_description' => [
                    'ar' => 'تصفح سيارات BYD المتوفرة واحجز سيارتك بدفعة مقدمة عبر الإنترنت.',
                    'en' => 'Browse available BYD cars and reserve yours online with a deposit.',
                ],
            ],
            'parts' => [
                'meta_title' => ['ar' => 'قطع غيار BYD أصلية | عبد الواحد موتورز', 'en' => 'Genuine BYD Spare Parts | Abdul Wahid Motors'],
                'meta_description' => [
                    'ar' => 'قطع غيار أصلية لسيارات BYD مع توفر فوري في دمشق.',
                    'en' => 'Genuine BYD spare parts, in stock in Damascus.',
                ],
            ],
        ];

        foreach ($rows as $key => $text) {
            if (SeoMeta::where('route_key', $key)->exists()) {
                continue;
            }

            SeoMeta::create(['route_key' => $key, 'og_type' => 'website'] + $text);
        }
    }
}

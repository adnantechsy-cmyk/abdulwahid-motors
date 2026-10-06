<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\SparePart;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;

/**
 * LOCAL ONLY (DatabaseSeeder guards it). Prices and specs are placeholders for
 * development, not real offers.
 */
class DemoCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $sedan = Category::updateOrCreate(['type' => 'vehicle', 'slug' => 'sedan'], ['name' => ['ar' => 'سيدان', 'en' => 'Sedan'], 'sort_order' => 1]);
        $suv = Category::updateOrCreate(['type' => 'vehicle', 'slug' => 'suv'], ['name' => ['ar' => 'SUV', 'en' => 'SUV'], 'sort_order' => 2]);
        $brakes = Category::updateOrCreate(['type' => 'spare_part', 'slug' => 'brakes'], ['name' => ['ar' => 'المكابح', 'en' => 'Brakes'], 'sort_order' => 1]);
        $filters = Category::updateOrCreate(['type' => 'spare_part', 'slug' => 'filters'], ['name' => ['ar' => 'الفلاتر', 'en' => 'Filters'], 'sort_order' => 2]);

        Vehicle::updateOrCreate(['slug' => 'demo-seal-awd'], [
            'sku' => 'DEMO-V-001',
            'name' => ['ar' => 'بي واي دي سيل AWD', 'en' => 'BYD Seal AWD'],
            'tagline' => ['ar' => 'سيدان كهربائية بالكامل', 'en' => 'All-electric sport sedan'],
            'description' => ['ar' => 'سيارة تجريبية لأغراض التطوير.', 'en' => 'Demo vehicle for development.'],
            'model_year' => 2025,
            'body_type' => 'sedan',
            'category_id' => $sedan->id,
            'powertrain' => 'bev',
            'exterior_color' => 'Black',
            'specs' => ['battery_kwh' => 82.5, 'range_km' => 520, 'seats' => 5],
            'price' => '45000.00',
            'deposit_amount' => '2000.00',
            'currency' => 'USD',
            'status' => 'available',
            'branch' => 'sahnaya',
            'is_published' => true,
            'is_featured' => true,
        ]);

        Vehicle::updateOrCreate(['slug' => 'demo-atto-3'], [
            'sku' => 'DEMO-V-002',
            'name' => ['ar' => 'بي واي دي أتو 3', 'en' => 'BYD Atto 3'],
            'tagline' => ['ar' => 'SUV كهربائية مدمجة', 'en' => 'Compact electric SUV'],
            'description' => ['ar' => 'سيارة تجريبية لأغراض التطوير.', 'en' => 'Demo vehicle for development.'],
            'model_year' => 2025,
            'body_type' => 'suv',
            'category_id' => $suv->id,
            'powertrain' => 'bev',
            'exterior_color' => 'White',
            'specs' => ['battery_kwh' => 60.5, 'range_km' => 420, 'seats' => 5],
            'price' => '32000.00',
            'deposit_amount' => '1500.00',
            'currency' => 'USD',
            'status' => 'available',
            'branch' => 'kafr_sousa',
            'is_published' => true,
        ]);

        // Stock is set directly here only because this is seed data;
        // everywhere else it changes through StockService.
        SparePart::updateOrCreate(['sku' => 'DEMO-P-001'], [
            'slug' => 'demo-front-brake-pads',
            'name' => ['ar' => 'فحمات فرامل أمامية', 'en' => 'Front brake pads'],
            'description' => ['ar' => 'قطعة تجريبية.', 'en' => 'Demo part.'],
            'category_id' => $brakes->id,
            'price' => '85.00',
            'currency' => 'USD',
            'is_oem' => true,
            'compatible_models' => ['Seal', 'Atto 3'],
            'stock_quantity' => 12,
            'low_stock_threshold' => 3,
            'is_published' => true,
        ]);

        SparePart::updateOrCreate(['sku' => 'DEMO-P-002'], [
            'slug' => 'demo-cabin-air-filter',
            'name' => ['ar' => 'فلتر هواء المقصورة', 'en' => 'Cabin air filter'],
            'description' => ['ar' => 'قطعة تجريبية.', 'en' => 'Demo part.'],
            'category_id' => $filters->id,
            'price' => '25.00',
            'currency' => 'USD',
            'is_oem' => true,
            'compatible_models' => ['Atto 3', 'Dolphin'],
            'stock_quantity' => 2,
            'low_stock_threshold' => 3,       // shows up as a low-stock alert on the dashboard
            'is_published' => true,
        ]);
    }
}

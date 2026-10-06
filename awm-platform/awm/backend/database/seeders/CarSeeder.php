<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * The BYD cars we showcase, with their full specifications and feature lists (Arabic and English).
 *
 *   php artisan db:seed --class=CarSeeder
 *
 * New cars are created UNPUBLISHED with the price hidden ("Contact us for price") and no photos, so nothing goes
 * live by accident: add photos, set the price and publish each one in the admin. Safe to run again at any time:
 * an existing car (matched by SKU) only gets what is still missing (new spec keys, empty features, a brochure
 * that was dropped into storage). Its name, price, status and published flag are never touched.
 *
 * Brochures: put a PDF named after the car's slug (e.g. byd-seagull-2026.pdf) in
 * storage/app/public/brochures/seed/ and run this seeder again; it attaches the file to the car.
 */
class CarSeeder extends Seeder
{
    private const CATEGORIES = [
        'hatchback' => ['name' => ['ar' => 'هاتشباك', 'en' => 'Hatchback'], 'sort_order' => 3],
        'sedan' => ['name' => ['ar' => 'سيدان', 'en' => 'Sedan'], 'sort_order' => 1],
        'suv' => ['name' => ['ar' => 'SUV', 'en' => 'SUV'], 'sort_order' => 2],
    ];

    public function run(): void
    {
        $categories = [];
        foreach (self::CATEGORIES as $slug => $attributes) {
            $categories[$slug] = Category::firstOrCreate(['type' => 'vehicle', 'slug' => $slug], $attributes + ['is_active' => true]);
        }

        $created = 0;
        $updated = 0;

        foreach (require __DIR__ . '/data/cars.php' as $i => $car) {
            $vehicle = Vehicle::where('sku', $car['sku'])->first();

            if (! $vehicle) {
                $vehicle = Vehicle::create([
                    'sku' => $car['sku'],
                    'slug' => $car['slug'],
                    'name' => $car['name'],
                    'description' => $car['description'],
                    'model_year' => $car['year'],
                    'body_type' => $car['category'],
                    'powertrain' => $car['powertrain'],
                    'category_id' => $categories[$car['category']]->id,
                    'price' => 0,
                    'show_price' => false,          // "Contact us for price" until a real price is set
                    'deposit_amount' => 0,
                    'currency' => 'USD',
                    'status' => 'available',
                    'is_published' => false,        // staff publish after adding photos and the price
                    'is_featured' => false,
                    'sort_order' => $i + 1,
                    'specs' => $car['specs'],
                    'features' => $car['features'],
                ]);
                $created++;
            } else {
                $changes = [];
                $specs = $vehicle->specs ?? [];
                $merged = $specs + $car['specs'];                 // existing values win; only new keys are added
                if ($merged !== $specs) {
                    $changes['specs'] = $merged;
                }
                if (empty($vehicle->features)) {
                    $changes['features'] = $car['features'];
                }
                if ($changes) {
                    $vehicle->update($changes);
                    $updated++;
                }
            }

            $pdf = "brochures/seed/{$car['slug']}.pdf";
            if (! $vehicle->brochure_path && Storage::disk('public')->exists($pdf)) {
                $vehicle->update(['brochure_path' => $pdf]);
            }
        }

        $this->command?->info("Cars: {$created} created, {$updated} completed. New cars are unpublished with the price hidden.");
    }
}
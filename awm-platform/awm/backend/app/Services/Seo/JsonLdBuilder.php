<?php

namespace App\Services\Seo;

use App\Enums\VehicleStatus;
use App\Models\SparePart;
use App\Models\Vehicle;

/** Builds schema.org JSON-LD arrays. The frontend only prints them. */
class JsonLdBuilder
{
    public function organization(string $locale): array
    {
        $site = rtrim(config('awm.frontend_url'), '/');

        return [
            '@context' => 'https://schema.org',
            '@type' => 'AutoDealer',
            '@id' => "{$site}/#organization",
            'name' => config("awm.name.{$locale}"),
            'url' => "{$site}/{$locale}",
            'brand' => ['@type' => 'Brand', 'name' => config('awm.brand')],
            'areaServed' => 'SY',
            'department' => collect(config('awm.branches'))->map(fn ($b) => [
                '@type' => 'AutoDealer',
                'name' => $b['name'][$locale],
                'address' => [
                    '@type' => 'PostalAddress',
                    'streetAddress' => $b['street'][$locale],
                    'addressLocality' => $b['city'][$locale],
                    'addressCountry' => 'SY',
                ],
            ])->values()->all(),
        ];
    }

    public function vehicle(Vehicle $v, string $locale, string $url): array
    {
        $data = [
            '@context' => 'https://schema.org',
            '@type' => 'Car',
            'name' => $v->getTranslation('name', $locale),
            'url' => $url,
            'brand' => ['@type' => 'Brand', 'name' => config('awm.brand')],
            'vehicleModelDate' => (string) $v->model_year,
            'bodyType' => $v->body_type,
            'fuelType' => match ($v->powertrain) {
                'bev' => 'Electric',
                'phev', 'hev' => 'Hybrid',
                default => 'Gasoline',
            },
            'offers' => [
                '@type' => 'Offer',
                'price' => (string) $v->price,
                'priceCurrency' => $v->currency,
                'url' => $url,
                'availability' => match ($v->status) {
                    VehicleStatus::Available => 'https://schema.org/InStock',
                    VehicleStatus::Incoming => 'https://schema.org/PreOrder',
                    VehicleStatus::Reserved => 'https://schema.org/LimitedAvailability',
                    VehicleStatus::Sold => 'https://schema.org/SoldOut',
                },
                'seller' => ['@id' => rtrim(config('awm.frontend_url'), '/') . '/#organization'],
            ],
        ];

        if ($desc = $v->getTranslation('description', $locale)) $data['description'] = $desc;
        if ($img = $v->coverUrl()) $data['image'] = $img;
        if ($v->vin) $data['vehicleIdentificationNumber'] = $v->vin;

        return $data;
    }

    public function part(SparePart $p, string $locale, string $url): array
    {
        $data = [
            '@context' => 'https://schema.org',
            '@type' => 'Product',
            'name' => $p->getTranslation('name', $locale),
            'sku' => $p->sku,
            'url' => $url,
            'category' => $p->category?->getTranslation('name', $locale),
            'brand' => ['@type' => 'Brand', 'name' => $p->is_oem ? config('awm.brand') : 'Aftermarket'],
            'offers' => [
                '@type' => 'Offer',
                'price' => (string) $p->price,
                'priceCurrency' => $p->currency,
                'url' => $url,
                'itemCondition' => 'https://schema.org/NewCondition',
                'availability' => $p->availableQuantity() > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                'seller' => ['@id' => rtrim(config('awm.frontend_url'), '/') . '/#organization'],
            ],
        ];

        if ($desc = $p->getTranslation('description', $locale)) $data['description'] = $desc;
        if ($img = $p->coverUrl()) $data['image'] = $img;

        return $data;
    }

    /** @param array<int, array{name:string,url:string}> $trail */
    public function breadcrumbs(array $trail): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => collect($trail)->values()->map(fn ($c, $i) => [
                '@type' => 'ListItem',
                'position' => $i + 1,
                'name' => $c['name'],
                'item' => $c['url'],
            ])->all(),
        ];
    }
}

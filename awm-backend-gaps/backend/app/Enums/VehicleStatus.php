<?php

namespace App\Enums;

enum VehicleStatus: string
{
    case Available = 'available';
    case Incoming = 'incoming';   // ordered from BYD, not in the showroom yet
    case Reserved = 'reserved';   // deposit order placed
    case Sold = 'sold';

    public function label(string $locale = 'ar'): string
    {
        return match ($this) {
            self::Available => $locale === 'ar' ? 'متوفرة' : 'Available',
            self::Incoming => $locale === 'ar' ? 'قيد الوصول' : 'Incoming',
            self::Reserved => $locale === 'ar' ? 'محجوزة' : 'Reserved',
            self::Sold => $locale === 'ar' ? 'مباعة' : 'Sold',
        };
    }
}

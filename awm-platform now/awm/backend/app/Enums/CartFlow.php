<?php

namespace App\Enums;

/** The three checkout flows. Mirrors cart_items.flow / orders.flow. */
enum CartFlow: string
{
    case SparePart = 'spare_part';
    case VehicleReservation = 'vehicle_reservation';
    case MaintenanceInvoice = 'maintenance_invoice';

    /** Only spare parts can be bought in quantities above 1. */
    public function allowsQuantity(): bool
    {
        return $this === self::SparePart;
    }

    public function label(string $locale = 'ar'): string
    {
        return match ($this) {
            self::SparePart => $locale === 'ar' ? 'قطع غيار' : 'Spare parts',
            self::VehicleReservation => $locale === 'ar' ? 'حجز سيارة' : 'Vehicle reservation',
            self::MaintenanceInvoice => $locale === 'ar' ? 'فاتورة صيانة' : 'Maintenance invoice',
        };
    }
}

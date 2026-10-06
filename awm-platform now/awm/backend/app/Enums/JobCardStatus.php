<?php

namespace App\Enums;

enum JobCardStatus: string
{
    case Pending = 'pending';
    case InProgress = 'in_progress';
    case WaitingParts = 'waiting_parts';
    case Completed = 'completed';

    public function label(string $locale = 'ar'): string
    {
        return match ($this) {
            self::Pending => $locale === 'ar' ? 'بالانتظار' : 'Pending',
            self::InProgress => $locale === 'ar' ? 'قيد العمل' : 'In progress',
            self::WaitingParts => $locale === 'ar' ? 'بانتظار القطع' : 'Waiting for parts',
            self::Completed => $locale === 'ar' ? 'مكتملة' : 'Completed',
        };
    }
}

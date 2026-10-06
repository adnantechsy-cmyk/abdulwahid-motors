<?php

namespace App\Enums;

enum PdiStatus: string
{
    case Pending = 'pending';
    case InProgress = 'in_progress';
    case Passed = 'passed';
    case Failed = 'failed';

    public function label(string $locale = 'ar'): string
    {
        return match ($this) {
            self::Pending => $locale === 'ar' ? 'بانتظار الفحص' : 'Awaiting inspection',
            self::InProgress => $locale === 'ar' ? 'قيد الفحص' : 'Inspection in progress',
            self::Passed => $locale === 'ar' ? 'اجتاز الفحص' : 'Inspection passed',
            self::Failed => $locale === 'ar' ? 'يحتاج معالجة' : 'Needs attention',
        };
    }
}

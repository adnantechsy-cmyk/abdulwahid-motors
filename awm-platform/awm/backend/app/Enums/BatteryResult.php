<?php

namespace App\Enums;

enum BatteryResult: string
{
    case Pass = 'pass';
    case Attention = 'attention';
    case Fail = 'fail';

    /** Default grading from state of health; the technician may override it. */
    public static function fromStateOfHealth(float $soh): self
    {
        return match (true) {
            $soh >= (float) config('awm.battery.pass_min_soh', 85) => self::Pass,
            $soh >= (float) config('awm.battery.attention_min_soh', 70) => self::Attention,
            default => self::Fail,
        };
    }

    public function label(string $locale = 'ar'): string
    {
        return match ($this) {
            self::Pass => $locale === 'ar' ? 'سليمة' : 'Healthy',
            self::Attention => $locale === 'ar' ? 'تحتاج متابعة' : 'Needs monitoring',
            self::Fail => $locale === 'ar' ? 'تحتاج صيانة' : 'Service required',
        };
    }
}

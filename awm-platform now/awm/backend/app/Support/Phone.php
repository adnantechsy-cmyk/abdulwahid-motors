<?php

namespace App\Support;

final class Phone
{
    /** Syrian mobiles: 09XXXXXXXX / 9639XXXXXXXX / +963 9XX... -> +9639XXXXXXXX. Others: + and digits. */
    public static function normalise(?string $phone): ?string
    {
        if ($phone === null || trim($phone) === '') {
            return null;
        }
        $digits = preg_replace('/\D/', '', $phone);
        if (str_starts_with($digits, '09') && strlen($digits) === 10) {
            return '+963' . substr($digits, 1);
        }
        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        return '+' . $digits;
    }
}

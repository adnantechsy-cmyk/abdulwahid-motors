<?php

namespace App\Services\Auth;

/**
 * Time-based one-time passwords (RFC 6238, SHA-1, 6 digits, 30-second steps), the format every authenticator app
 * understands (Google Authenticator, Microsoft Authenticator, Authy, 1Password...). No third-party package needed.
 */
class Totp
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    private const STEP = 30;
    private const DIGITS = 6;

    /** A new random secret: 20 bytes (160 bits), shown to the user as 32 base32 characters. */
    public static function generateSecret(): string
    {
        return self::base32Encode(random_bytes(20));
    }

    /** The otpauth:// link that authenticator apps read from a QR code. */
    public static function uri(string $secret, string $account, string $issuer): string
    {
        return 'otpauth://totp/' . rawurlencode("{$issuer}:{$account}")
            . '?secret=' . $secret
            . '&issuer=' . rawurlencode($issuer)
            . '&algorithm=SHA1&digits=' . self::DIGITS . '&period=' . self::STEP;
    }

    /**
     * Checks a code against the current time step and one step either side (clock drift).
     * Returns the matching step number, or null. Callers store the step to refuse the same code twice.
     */
    public static function verify(string $secret, string $code, ?int $now = null): ?int
    {
        $code = preg_replace('/\s+/', '', $code);
        if (! preg_match('/^\d{' . self::DIGITS . '}$/', $code)) {
            return null;
        }

        $key = self::base32Decode($secret);
        $current = intdiv($now ?? time(), self::STEP);

        for ($step = $current - 1; $step <= $current + 1; $step++) {
            if (hash_equals(self::code($key, $step), $code)) {
                return $step;
            }
        }

        return null;
    }

    /** The 6-digit code for one time step (HOTP, RFC 4226). */
    public static function code(string $key, int $step): string
    {
        $hash = hash_hmac('sha1', pack('N2', 0, $step), $key, true);
        $offset = ord($hash[19]) & 0x0F;
        $binary = unpack('N', substr($hash, $offset, 4))[1] & 0x7FFFFFFF;

        return str_pad((string) ($binary % (10 ** self::DIGITS)), self::DIGITS, '0', STR_PAD_LEFT);
    }

    public static function base32Encode(string $bytes): string
    {
        $bits = '';
        foreach (str_split($bytes) as $char) {
            $bits .= str_pad(decbin(ord($char)), 8, '0', STR_PAD_LEFT);
        }

        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= self::ALPHABET[bindec(str_pad($chunk, 5, '0', STR_PAD_RIGHT))];
        }

        return $out;
    }

    public static function base32Decode(string $text): string
    {
        $bits = '';
        foreach (str_split(strtoupper(preg_replace('/[^A-Za-z2-7]/', '', $text))) as $char) {
            $bits .= str_pad(decbin(strpos(self::ALPHABET, $char)), 5, '0', STR_PAD_LEFT);
        }

        $out = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $out .= chr(bindec($byte));
            }
        }

        return $out;
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/** Key/value site settings. Read through Setting::all() (cached); schema lives in config('awm.settings'). */
class Setting extends Model
{
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
    protected $casts = ['value' => 'array'];

    private const CACHE_KEY = 'awm.settings.v1';

    /** Every declared key with its stored value, falling back to the config default. */
    public static function allValues(): array
    {
        $stored = Cache::rememberForever(self::CACHE_KEY, fn () => static::query()->pluck('value', 'key')->all());

        return collect(config('awm.settings'))->mapWithKeys(fn ($def, $key) => [
            $key => array_key_exists($key, $stored) ? self::decode($stored[$key]) : ($def['default'] ?? null),
        ])->all();
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return static::allValues()[$key] ?? $default;
    }

    /** Public subset for the website, localised. */
    public static function publicValues(string $locale): array
    {
        return collect(static::allValues())
            ->filter(fn ($v, $key) => config("awm.settings.{$key}.public", false))
            ->map(fn ($v, $key) => config("awm.settings.{$key}.type") === 'translatable' && is_array($v) ? ($v[$locale] ?? null) : $v)
            ->all();
    }

    public static function putMany(array $values, ?int $userId = null): void
    {
        foreach ($values as $key => $value) {
            static::updateOrCreate(['key' => $key], ['value' => ['v' => $value], 'updated_by' => $userId]);
        }
        Cache::forget(self::CACHE_KEY);
    }

    /** Values are wrapped as {"v": ...} so scalars and null round-trip through the JSON column. */
    private static function decode(mixed $stored): mixed
    {
        return is_array($stored) && array_key_exists('v', $stored) ? $stored['v'] : $stored;
    }
}

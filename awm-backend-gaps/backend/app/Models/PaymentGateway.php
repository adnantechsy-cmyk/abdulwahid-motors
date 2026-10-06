<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Translatable\HasTranslations;

class PaymentGateway extends Model
{
    use HasTranslations;

    public array $translatable = ['name', 'instructions'];

    protected $guarded = ['id'];

    protected $casts = [
        'is_active' => 'boolean',
        'is_online' => 'boolean',
        'supported_currencies' => 'array',
        'supported_flows' => 'array',
        'config' => 'encrypted:array',     // API keys: encrypted at rest with APP_KEY
    ];

    protected $hidden = ['config'];

    public function supports(string $currency, string $flow): bool
    {
        return in_array($currency, $this->supported_currencies ?? [], true)
            && ($this->supported_flows === null || in_array($flow, $this->supported_flows, true));
    }
}

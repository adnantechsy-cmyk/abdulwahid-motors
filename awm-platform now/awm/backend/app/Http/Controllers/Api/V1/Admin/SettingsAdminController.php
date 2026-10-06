<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentGateway;
use App\Models\Setting;
use App\Services\Frontend\FrontendCache;
use Illuminate\Http\Request;

/** Figma 1:6091 site settings + payment gateway configuration ("Settings & integrations"). */
class SettingsAdminController extends Controller
{
    /** GET /admin/settings: schema + current values, for building the form. */
    public function index()
    {
        $values = Setting::allValues();

        return collect(config('awm.settings'))->map(fn ($def, $key) => [
            'key' => $key,
            'type' => $def['type'],
            'public' => $def['public'] ?? false,
            'value' => $values[$key],
        ])->values();
    }

    /** PUT /admin/settings {values: {key: value}}: unknown keys are rejected. */
    public function update(Request $request)
    {
        $schema = config('awm.settings');
        $rules = ['values' => ['required', 'array']];

        foreach ($request->input('values', []) as $key => $_) {
            $type = $schema[$key]['type'] ?? null;
            $field = 'values.' . str_replace('.', '\.', $key);   // keys contain dots
            $rules[$field] = match ($type) {
                'int' => ['nullable', 'integer', 'min:0'],
                'bool' => ['nullable', 'boolean'],
                'url' => ['nullable', 'url', 'max:500'],
                'email' => ['nullable', 'email', 'max:190'],
                'phone' => ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9 ]{6,20}$/'],
                'string' => ['nullable', 'string', 'max:500'],
                'translatable' => ['nullable', 'array:ar,en'],
                default => ['prohibited'],
            };
            if ($type === 'translatable') {
                $rules[$field . '.*'] = ['nullable', 'string', 'max:1000'];
            }
        }

        $values = $request->validate($rules)['values'];
        $values = collect($values)->map(fn ($v, $k) => match ($schema[$k]['type']) {
            'int' => $v === null ? null : (int) $v,
            'bool' => (bool) $v,
            default => $v,
        })->all();

        Setting::putMany($values, $request->user()->id);
        FrontendCache::purge('settings');

        return $this->index();
    }

    /** GET /admin/payment-gateways */
    public function gateways()
    {
        return PaymentGateway::orderBy('sort_order')->get()->map(fn (PaymentGateway $g) => $this->gateway($g));
    }

    /**
     * PUT /admin/payment-gateways/{gateway}
     * config is write-only: send only the keys to change; blank values keep the stored secret.
     */
    public function updateGateway(Request $request, PaymentGateway $gateway)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'array:ar,en'], 'name.*' => ['string', 'max:120'],
            'instructions' => ['nullable', 'array:ar,en'], 'instructions.*' => ['nullable', 'string', 'max:3000'],
            'is_active' => ['sometimes', 'boolean'],
            'supported_currencies' => ['sometimes', 'array', 'min:1'], 'supported_currencies.*' => ['in:USD,SYP'],
            'supported_flows' => ['nullable', 'array'], 'supported_flows.*' => ['in:spare_part,vehicle_reservation,maintenance_invoice'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'config' => ['sometimes', 'array'], 'config.*' => ['nullable', 'string', 'max:500'],
        ]);

        if (array_key_exists('config', $data)) {
            $data['config'] = array_merge($gateway->config ?? [], array_filter($data['config'], fn ($v) => $v !== null && $v !== ''));
        }
        if (($data['is_active'] ?? false) && $gateway->code === 'stripe' && empty(($data['config'] ?? $gateway->config ?? [])['secret_key'])) {
            abort(422, 'Add the API keys before activating this gateway.');
        }
        $gateway->update($data);

        return $this->gateway($gateway->fresh());
    }

    private function gateway(PaymentGateway $g): array
    {
        return [
            'id' => $g->id,
            'code' => $g->code,
            'name' => $g->getTranslations('name'),
            'instructions' => $g->getTranslations('instructions'),
            'is_active' => $g->is_active,
            'is_online' => $g->is_online,
            'supported_currencies' => $g->supported_currencies,
            'supported_flows' => $g->supported_flows,
            'sort_order' => $g->sort_order,
            // Secrets are never sent back; only which keys are set.
            'config_keys_set' => array_keys(array_filter($g->config ?? [])),
        ];
    }
}

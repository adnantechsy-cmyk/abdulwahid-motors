<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BatteryInspection;

/** Public verification of a battery certificate (QR code on the printed report points here). */
class CertificateController extends Controller
{
    /** GET /api/v1/certificates/{code} */
    public function show(string $code)
    {
        $report = BatteryInspection::where('verification_code', strtoupper($code))->with('customerVehicle')->firstOrFail();

        return $report->toReportArray(app()->getLocale(), public: true);
    }
}

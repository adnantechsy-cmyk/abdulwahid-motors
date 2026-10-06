<?php

namespace App\Enums;

enum AppointmentStatus: string
{
    case Requested = 'requested';
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';
    case Completed = 'completed';
    case NoShow = 'no_show';

    /** Holds a place in the branch's slot capacity. */
    public function occupiesSlot(): bool
    {
        return in_array($this, [self::Requested, self::Confirmed], true);
    }
}

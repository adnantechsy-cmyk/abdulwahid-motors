<?php

use App\Models\Cart;
use Illuminate\Support\Facades\Schedule;

/*
| Shared hosting has no supervisor, so ONE cron entry drives everything:
|   * * * * * cd /home/USER/domains/api.abdulwahidmotors.com/laravel && php artisan schedule:run >> /dev/null 2>&1
*/

// Queue: drain jobs every minute and exit (no long-running worker on shared hosting).
Schedule::command('queue:work --stop-when-empty --tries=3 --max-time=50')
    ->everyMinute()->withoutOverlapping(5);

Schedule::command('awm:release-expired-orders')->hourly()->withoutOverlapping();

// Abandoned guest carts.
Schedule::call(fn () => Cart::where('status', 'active')->whereNull('user_id')
    ->where('updated_at', '<', now()->subDays(30))->delete())->daily();

Schedule::command('sanctum:prune-expired --hours=24')->daily();

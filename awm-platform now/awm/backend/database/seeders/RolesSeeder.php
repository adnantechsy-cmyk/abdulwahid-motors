<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/** Idempotent: safe to re-run on production after adding permissions. */
class RolesSeeder extends Seeder
{
    /** permission => roles that get it (admin always gets everything). */
    private const MATRIX = [
        'dashboard.view' => ['sales', 'technician', 'inventory'],
        'vehicles.manage' => ['sales'],
        'orders.manage' => ['sales'],
        'customers.manage' => ['sales'],
        'payments.confirm' => ['sales'],
        'job_cards.manage' => [],                 // create, assign technicians
        'job_cards.work' => ['technician'],       // update status, use parts
        'parts.manage' => ['inventory'],
        'stock.adjust' => ['inventory'],
        'pages.manage' => [],
        'seo.manage' => [],
        'settings.manage' => [],
        'users.manage' => [],
        'categories.manage' => ['sales', 'inventory'],
        'pdi.manage' => ['technician', 'sales'],
        'battery.inspect' => ['technician'],
        'appointments.manage' => ['sales'],
        'invoices.manage' => ['sales'],
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // Guard "web": spatie resolves the User model's guard from config/auth.php, and this
        // also works for requests authenticated with Sanctum tokens.
        foreach (array_keys(self::MATRIX) as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $roles = collect(['admin', 'sales', 'technician', 'inventory'])
            ->mapWithKeys(fn ($r) => [$r => Role::findOrCreate($r, 'web')]);

        $roles['admin']->syncPermissions(array_keys(self::MATRIX));

        foreach (['sales', 'technician', 'inventory'] as $role) {
            $roles[$role]->syncPermissions(
                collect(self::MATRIX)->filter(fn ($rs) => in_array($role, $rs, true))->keys()->all(),
            );
        }

        $this->seedAdmin();
    }

    /**
     * First admin account. Production: set ADMIN_EMAIL + ADMIN_PASSWORD in .env before seeding,
     * then remove them. Local: falls back to admin@awm.test / password.
     */
    private function seedAdmin(): void
    {
        $email = env('ADMIN_EMAIL') ?: (app()->environment('local') ? 'admin@awm.test' : null);
        $password = env('ADMIN_PASSWORD') ?: (app()->environment('local') ? 'password' : null);

        if (! $email || ! $password) {
            $this->command?->warn('No admin created: set ADMIN_EMAIL and ADMIN_PASSWORD to seed one.');
            return;
        }

        $admin = User::firstOrCreate(['email' => $email], ['name' => 'Administrator', 'password' => $password]);
        $admin->assignRole('admin');
    }
}

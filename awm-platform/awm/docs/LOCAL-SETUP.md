# Abdul Wahid Motors: setup

## 1. Create the Laravel skeleton (once)

The repo ships the application code; the Laravel framework files are installed around it.

```bash
docker compose up -d mysql app

# Install Laravel into a temp dir, then merge it under ./backend WITHOUT overwriting our files
docker compose run --rm app sh -c "composer create-project laravel/laravel /tmp/skel && cp -rn /tmp/skel/. /var/www/html/"

docker compose run --rm app composer require \
    laravel/sanctum spatie/laravel-permission spatie/laravel-translatable stripe/stripe-php
```

Copy `backend/.env.example` to `backend/.env` and add:

```
APP_LOCALE=ar
DB_HOST=mysql
DB_DATABASE=awm
DB_USERNAME=awm
DB_PASSWORD=secret

FRONTEND_URL=http://localhost:3000
REVALIDATE_SECRET=change-me          # must equal the frontend's REVALIDATE_SECRET
STRIPE_SECRET=
STRIPE_WEBHOOK_SECRET=
```

## 2. Wire it up (Laravel 11/12 `bootstrap/app.php`)

```php
->withRouting(web: __DIR__.'/../routes/web.php', api: __DIR__.'/../routes/api.php', commands: __DIR__.'/../routes/console.php', health: '/up')
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias(['permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class]);
})
```

- Add `HasRoles` and `HasApiTokens` to `App\Models\User`.
- Register `App\Providers\AppServiceProvider` (already in `bootstrap/providers.php` by default).
- `config/filesystems.php`: add a `private` disk (`driver: local`, `root: storage_path('app/private')`) for payment receipts.
- `config/cors.php`: allow `FRONTEND_URL` for `api/*` and the headers `X-Cart-Token`, `X-Locale`, `Idempotency-Key`.
- Publish the vendor migrations: `php artisan vendor:publish` for Sanctum and spatie/permission, then **make sure their migrations run before ours** (ours reference `users`).

## 3. Migrate + seed

```bash
docker compose exec app php artisan migrate --seed
docker compose exec app php artisan storage:link
```

Seeds: roles (admin / sales / technician / inventory), 3 payment gateways, starter SEO text for the six static pages, and (local only) 2 demo cars + 2 demo parts.

## 4. Frontend

`frontend/.env.local`:

```
REVALIDATE_SECRET=change-me
```

```bash
docker compose up -d        # frontend installs deps and starts on :3000
```

## 5. Smoke tests

```bash
# SEO payload with JSON-LD for the demo car
curl "http://localhost:8080/api/v1/seo/vehicles/demo-seal-awd?locale=en"

# Sitemap feed
curl http://localhost:8080/api/v1/seo/sitemap

# Public page
open http://localhost:3000/ar/vehicles/demo-seal-awd
open http://localhost:3000/sitemap.xml
```

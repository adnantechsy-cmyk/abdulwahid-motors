# Backend gaps pack

Paths match Laravel 11/12. Run the package installs in step 1 **before** copying this pack in, because `install:api` writes its own `routes/api.php` and edits `bootstrap/app.php`. This pack's versions must land on top.

## What's in it

**New files**

| Area | Files |
|---|---|
| Migrations | `000005` users CRM fields, `000006` vehicles, `000007` spare_parts + stock_movements, `000008` customer_vehicles, `000009` job_cards + job_card_parts, `000010` maintenance_invoices, `000011` pages |
| Enums | CartFlow, OrderStatus, PaymentStatus, VehicleStatus, JobCardStatus |
| Models | Cart, CartItem, Order, OrderItem, Payment, PaymentEvent, PaymentGateway, SeoMeta, StockMovement, CustomerVehicle, JobCard, JobCardPart, Page, User (replaces the default) |
| Trait | `Models/Concerns/HasSeo` |
| Support classes | CheckoutException, InsufficientStockException, PaymentInitResult, WebhookEvent |
| Middleware | SetApiLocale, UseSanctumGuard |
| Controllers | `Api/V1/CatalogController`, `Api/V1/SeoController` |
| Config | `config/awm.php` (business settings, branches, static routes), `config/cors.php`, `config/filesystems.php` (adds the `private` disk) |
| Seeders | RolesSeeder, PaymentGatewaySeeder, SeoSeeder, DemoCatalogSeeder (+ the existing DatabaseSeeder) |
| Bootstrap | `bootstrap/app.php` (routing, spatie middleware aliases, trusted proxies, JSON errors) |

**Replaced files (fixes to earlier code)**

| File | Why |
|---|---|
| `app/Services/Checkout/CheckoutService.php` | Temporary order number was `'TMP-' . uuid` = 40 chars, longer than `orders.number` (32). MySQL strict mode would reject every checkout. |
| `app/Providers/AppServiceProvider.php` | Morph map lacked `order` and `job_card`. `StockService` records those as references, and `enforceMorphMap` throws on unmapped models, so selling or using a part would have crashed. |
| `routes/api.php` | Adds `UseSanctumGuard`. Without it, `$request->user()` on the public cart/checkout/pay routes is always null, so logged-in customers were treated as guests. |

## Install + verify

```bash
# 1. Packages (if not installed yet)
docker compose run --rm app composer require laravel/sanctum spatie/laravel-permission spatie/laravel-translatable stripe/stripe-php
docker compose exec app php artisan install:api                  # Sanctum migration + api route wiring
docker compose exec app php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"

# 2. Copy this pack's backend/ over ./backend (overwrite when asked)
# 3. Merge .env.additions into backend/.env, then:
docker compose exec app php artisan key:generate                   # needed: gateway config is encrypted with APP_KEY
docker compose exec app php artisan migrate:fresh --seed
docker compose exec app php artisan storage:link

# Syntax check every file in the pack
docker compose exec app sh -c 'find app config database routes bootstrap -name "*.php" -print0 | xargs -0 -n1 php -l | grep -v "No syntax errors"'

# Smoke tests
curl -s "http://localhost:8080/api/v1/vehicles?locale=ar" | head -c 400
curl -s "http://localhost:8080/api/v1/seo/vehicles/demo-seal-awd?locale=en" | head -c 400
curl -s  http://localhost:8080/api/v1/seo/sitemap | head -c 400
curl -s -X PUT http://localhost:8080/api/v1/cart -H 'Content-Type: application/json' \
     -d '{"lines":[{"type":"spare_part","id":1,"quantity":2},{"type":"vehicle","id":1}]}'
```

Migration order: the spatie/Sanctum migrations get today's timestamp, so they run after ours. That's fine. None of our tables reference them, and seeding happens after all migrations.

## Not included (waiting on your decision)

PDI tracking, Blade battery certificates, appointment booking and a categories table. `spare_parts.category` is a plain string until categories are approved, so it converts to a foreign key cleanly later.

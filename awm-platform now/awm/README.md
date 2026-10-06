# Abdul Wahid Motors platform

Laravel API (`backend/`) + Next.js App Router frontend (`frontend/`). Docker is for local development only; production runs on Hostinger (see `docs/HOSTINGER-DEPLOY.md`).

## Local setup

The repo holds the application code only. The Laravel framework skeleton is installed around it once, without overwriting any project file.

```bash
docker compose up -d mysql app

# 1. Laravel skeleton (cp -n never overwrites our files)
docker compose run --rm app sh -c "composer create-project laravel/laravel /tmp/skel && cp -rn /tmp/skel/. /var/www/html/"

# 2. Packages
docker compose run --rm app composer require laravel/sanctum spatie/laravel-permission spatie/laravel-translatable stripe/stripe-php
docker compose exec app php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
docker compose exec app php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"

# 3. Environment: merge backend/.env.additions into backend/.env, then
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate:fresh --seed
docker compose exec app php artisan storage:link

# 4. Frontend
cp frontend/.env.example frontend/.env.local      # REVALIDATE_SECRET must match the backend
docker compose up -d                               # Next.js on :3000, API on :8080
```

Local admin login: `admin@awm.test` / `password` (created by RolesSeeder in the local environment only).

## Verify

None of this code has been executed yet: it was written without a PHP or npm environment. Run these first and fix anything they report.

```bash
# PHP syntax, every project file
docker compose exec app sh -c 'find app config database routes bootstrap -name "*.php" -print0 | xargs -0 -n1 php -l | grep -v "No syntax errors"'

# Routes register (catches bad controller references)
docker compose exec app php artisan route:list --path=api

# Frontend types + production build (the same build Hostinger runs)
docker compose exec frontend npx tsc --noEmit
docker compose exec frontend npm run build

# API smoke tests
curl -s "http://localhost:8080/api/v1/vehicles?locale=ar" | head -c 300
curl -s "http://localhost:8080/api/v1/seo/vehicles/demo-seal-awd?locale=en" | head -c 300
curl -s "http://localhost:8080/api/v1/appointments/slots?branch=sahnaya&date=$(date -d '+2 day' +%F)"
curl -s -X POST http://localhost:8080/api/v1/auth/login -H 'Content-Type: application/json' \
     -d '{"login":"admin@awm.test","password":"password"}'
```

Then open http://localhost:3000/ar/vehicles/demo-seal-awd, add the car to the cart, and check the drawer in both `/ar` (opens from the left) and `/en` (opens from the right).

## What exists

| Area | Status |
|---|---|
| Database | 18 migrations: cart, orders, payments, SEO, users/CRM, vehicles, parts + stock log, customer vehicles, job cards, invoices + payment ledger, pages, settings, categories, PDI, battery certificates, appointments |
| Checkout + payments | Polymorphic cart, one order per flow, gateway drivers (bank transfer, mobile money on; card off), webhooks, offline confirmation |
| Inventory | Stock only changes through `StockService`, audited; parts used on job cards deduct automatically and can be returned |
| Auth | Token login/register by phone or email; roles admin / sales / technician / inventory |
| Public API | Catalogue, categories, site settings, CMS pages, SEO payloads, sitemap feed, certificate verification, appointment slots |
| Customer API | Summary, orders + delivery tracking, owned vehicles + service history, invoices, battery reports, appointments |
| Admin API | Dashboard KPIs; vehicles (CRUD, sale status, hide/show, photos); parts (CRUD, stock in/out, movement log, photo); job-card kanban (assign, use/return parts, complete -> invoice); customers + their vehicles; invoices (collect at counter, void); orders + payment confirmation queue + receipt download; pages; site settings; payment gateways; staff + roles; SEO; categories; PDI; battery inspections; appointments |
| Scheduled jobs | Queue via cron, unpaid-order release (hours set in settings), guest-cart cleanup, token pruning |
| Frontend | i18n (ar/en, RTL/LTR), SSR metadata, JSON-LD, sitemap, robots, revalidation hook, cart + slide-over drawer, car detail page, public header/footer, checkout + confirmation, login (interim), admin shell + overview, vehicles (list, panel, form), parts (list, stock, form), billing, SEO editor. See `docs/DESIGN-NOTES.md` |

List every endpoint with its middleware: `docker compose exec app php artisan route:list --path=api/v1`.

### Who can do what

| Permission | admin | sales | technician | inventory |
|---|:-:|:-:|:-:|:-:|
| dashboard.view | ✓ | ✓ | ✓ | ✓ |
| vehicles.manage, orders.manage, customers.manage, invoices.manage, payments.confirm, appointments.manage | ✓ | ✓ | | |
| categories.manage | ✓ | ✓ | | ✓ |
| pdi.manage | ✓ | ✓ | ✓ | |
| job_cards.work (own cards only), battery.inspect | ✓ | | ✓ | |
| parts.manage, stock.adjust | ✓ | | | ✓ |
| job_cards.manage, pages.manage, seo.manage, settings.manage, users.manage | ✓ | | | |

Change the matrix in `database/seeders/RolesSeeder.php` and re-run `php artisan db:seed --class=RolesSeeder` (safe on production).

## Not built yet

- **Frontend pages still needing Figma exports:** home, about, services, contact, catalogue lists, part page, register, customer account (dashboard, order tracking, vehicle + maintenance, battery report), job-card board, PDI orders, customers/CRM, categories, site settings. Send PNGs of those frames.
- **Password reset** (by email or SMS). Customers created at the counter get a random password until this exists.
- **Payment provider for cards:** the Stripe driver exists but is seeded inactive.
- **CMS page bodies are stored as HTML written by staff.** Sanitise them when rendering on the frontend.

## Docs

- `docs/HOSTINGER-DEPLOY.md`: production deployment, step by step
- `docs/FRONTEND-STRUCTURE.md`: planned Next.js route tree
- `docs/LOCAL-SETUP.md`: original setup notes and smoke tests

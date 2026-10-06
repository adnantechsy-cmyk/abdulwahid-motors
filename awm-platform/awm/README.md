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
| Database | 16 migrations: cart, orders, payments, SEO, users/CRM, vehicles, parts + stock log, customer vehicles, job cards, invoices, pages, categories, PDI, battery certificates, appointments |
| Checkout + payments | Polymorphic cart, one order per flow, gateway drivers (bank transfer, mobile money on; card off), webhooks, offline confirmation |
| Inventory | Stock only changes through `StockService`, audited; parts used on job cards deduct automatically |
| Auth | Token login/register by phone or email; roles admin / sales / technician / inventory |
| Customer API | Summary, orders + delivery tracking, owned vehicles + service history, invoices, battery reports, appointments |
| Public API | Catalogue, categories, SEO payloads, sitemap feed, certificate verification, appointment slots |
| Admin API | Payments, SEO, categories, PDI, battery inspections, appointments |
| Scheduled jobs | Queue via cron, unpaid-order release (48h), guest-cart cleanup, token pruning |
| Frontend | i18n (ar/en, RTL/LTR), SSR metadata, JSON-LD, sitemap, robots, revalidation hook, cart store + slide-over drawer, car detail page |

## Not built yet

- **Admin API for the core screens:** dashboard analytics, vehicles CRUD + status, parts + stock adjustments, job cards (kanban), customers/CRM, pages, settings.
- **Frontend pages from Figma:** home, about, services, contact, catalogue lists, part page, login/register, checkout, account, every admin screen. Waiting on PNG exports of the Figma frames.
- **Auth route handlers in Next.js** (login/logout setting the `awm_token` httpOnly cookie). These come with the login screen.
- **Payment provider for cards:** the Stripe driver exists but is seeded inactive.

## Docs

- `docs/HOSTINGER-DEPLOY.md`: production deployment, step by step
- `docs/FRONTEND-STRUCTURE.md`: planned Next.js route tree
- `docs/LOCAL-SETUP.md`: original setup notes and smoke tests

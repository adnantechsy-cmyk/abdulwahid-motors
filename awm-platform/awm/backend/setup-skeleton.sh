#!/usr/bin/env bash
# One-time setup on a fresh clone: installs the Laravel framework files around our code
# and the packages we use. Never overwrites a project file (cp -n).
#   cd <repo>/awm-platform/awm/backend && bash setup-skeleton.sh
# Safe to re-run: it stops at once if the skeleton is already there.
set -euo pipefail
cd "$(dirname "$0")"

PHP=${PHP:-php}
COMPOSER=${COMPOSER:-composer}

if [ -f artisan ] && [ -f composer.json ]; then
  echo "Skeleton already installed. Nothing to do. Next: composer install, then php artisan migrate --force"
  exit 0
fi

SKEL="$(mktemp -d "${TMPDIR:-$HOME}/awm-skel.XXXXXX")"
trap 'rm -rf "$SKEL"' EXIT

echo "==> Creating a fresh Laravel app in $SKEL"
$COMPOSER create-project laravel/laravel "$SKEL/app" --no-interaction --prefer-dist

echo "==> Merging it under $(pwd) without overwriting our files"
cp -rn "$SKEL/app/." .

echo "==> Installing the packages the platform uses"
$COMPOSER require laravel/sanctum spatie/laravel-permission spatie/laravel-translatable stripe/stripe-php --no-interaction

echo "==> Publishing vendor config and migrations (only if missing)"
ls database/migrations | grep -q personal_access_tokens || $PHP artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider" --no-interaction
ls database/migrations | grep -q create_permission_tables || $PHP artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider" --no-interaction

[ -f .env ] || { cp .env.production.example .env && $PHP artisan key:generate --force && echo "Created .env from .env.production.example: fill in DB_*, MAIL_*, REVALIDATE_SECRET, ADMIN_*"; }

echo "Done. Next: edit .env, then  $PHP artisan migrate --force && $PHP artisan db:seed --force"

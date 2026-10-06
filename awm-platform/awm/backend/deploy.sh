#!/usr/bin/env bash
# Run on the server over SSH from the Laravel folder:  bash deploy.sh
# Safe to re-run. Puts the API in maintenance mode only while migrations run.
set -euo pipefail
cd "$(dirname "$0")"

PHP=${PHP:-php}
COMPOSER=${COMPOSER:-composer}

git pull --ff-only

$COMPOSER install --no-dev --optimize-autoloader --no-interaction

$PHP artisan down --retry=15 || true
$PHP artisan migrate --force
$PHP artisan up

$PHP artisan storage:link 2>/dev/null || true
$PHP artisan optimize:clear
$PHP artisan optimize            # config, routes, views, events cached
$PHP artisan queue:restart       # cron-driven workers pick up the new code

echo "Deployed $(git rev-parse --short HEAD)"

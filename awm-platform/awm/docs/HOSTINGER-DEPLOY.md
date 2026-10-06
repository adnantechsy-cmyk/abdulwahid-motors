# Deploying to Hostinger

Two sites on one Hostinger account:

| Site | What | Runs as |
|---|---|---|
| `abdulwahidmotors.com` | Next.js frontend | Node.js web app (hPanel builds and runs it) |
| `api.abdulwahidmotors.com` | Laravel API + admin API | Regular PHP site |

Docker is for local development only. Nothing below uses it.

## 0. Check your plan first

Hostinger's documentation lists Node.js web apps on **Business Web Hosting** and **Cloud** plans only. In hPanel, go to **Websites → Add Website**. If **Node.js web app** is not offered, the plan can't run the Next.js server, and you need to upgrade before step A.

Also check SSH access (hPanel → **Advanced → SSH Access**). Steps B2–B5 use it.

## A. Frontend: Node.js web app

Hostinger builds Next.js in server mode: it adds `output: 'standalone'` to your config and starts the server itself. So **no custom `server.js` is needed**, and any entry file is ignored for Next.js apps. The one rule: `next.config.ts` must export an object, not a function. The provided config already does.

1. Push `frontend/` to its own GitHub repository (or the repo root must be the Next.js app).
2. hPanel → **Websites → Add Website → Node.js web app** → connect GitHub → pick the repo.
3. Check the detected settings:

   | Field | Value |
   |---|---|
   | Framework / application type | Next.js (`next`) |
   | Node version | 22 |
   | Build script | `build` |
   | Output directory | `.next` |

4. Add the **environment variables** before the first deploy. `NEXT_PUBLIC_*` values are baked in at build time, so changing them later needs a redeploy.

   ```
   API_URL_INTERNAL=https://api.abdulwahidmotors.com/api/v1
   NEXT_PUBLIC_API_URL=https://api.abdulwahidmotors.com/api/v1
   NEXT_PUBLIC_SITE_URL=https://abdulwahidmotors.com
   REVALIDATE_SECRET=<same long random string as the Laravel .env>
   # optional
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=<Google OAuth Web client ID; leave out to hide the Google button>
   NEXT_PUBLIC_CHECKOUT_MODE=request          # or: online
   ```

5. **Deploy**, then connect the domain `abdulwahidmotors.com` to the app and enable SSL.
6. Every `git push` to the selected branch redeploys automatically.

Hostinger runs Node.js apps on demand: after idle time, the first request starts the process again and is slower. Crawlers may hit that cold start occasionally. That's acceptable for SEO, but keep the homepage light.

## B. Backend: Laravel on `api.abdulwahidmotors.com`

**B1. Create the subdomain and database**
- hPanel → **Domains → Subdomains**: create `api`.
- hPanel → **Advanced → PHP Configuration** for that site: PHP **8.3**. Enable `intl`, `bcmath`, `gd`, `zip`, `fileinfo`, `pdo_mysql`.
- hPanel → **Databases → MySQL Databases**: create the database and user. Hostinger prefixes the names (`u123456789_awm`).

**B2. Upload the code (SSH)**

```bash
cd ~/domains/api.abdulwahidmotors.com      # check the exact folder name with `ls ~/domains`
git clone <your-backend-repo> laravel
cd laravel
composer install --no-dev --optimize-autoloader
cp .env.production.example .env           # then fill in DB_*, MAIL_*, REVALIDATE_SECRET, ADMIN_*
php artisan key:generate
```

**B3. Database + first admin**

```bash
php artisan migrate --force
php artisan db:seed --force                # roles, payment gateways, SEO text, first admin (demo catalogue is local-only)
php artisan storage:link
php artisan optimize
```

Then remove `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` and run `php artisan config:cache`.

**B4. Point the web root at `laravel/public`**

Laravel's code and `.env` must sit outside the web root. Replace the subdomain's `public_html` with a symlink:

```bash
cd ~/domains/api.abdulwahidmotors.com
mv public_html public_html.bak
ln -s laravel/public public_html
```

If symlinks aren't permitted on your account, move the project into `public_html/laravel/` and use `backend/public_html.htaccess.fallback` as `public_html/.htaccess`. It forwards everything into `laravel/public` and blocks everything else.

**B5. Cron (queue + scheduled jobs)**

Shared hosting has no supervisor, so a single cron entry drives the queue and all scheduled tasks (`routes/console.php`). In hPanel → **Advanced → Cron Jobs**, every minute:

```
/usr/bin/php /home/<USER>/domains/api.abdulwahidmotors.com/laravel/artisan schedule:run
```

(Run `which php` over SSH if `/usr/bin/php` is a different version than 8.3.)

**B6. Enable SSL** for the subdomain in hPanel → **Security → SSL**.

## C. Connect the two

- Laravel `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` → the public site.
- Both `REVALIDATE_SECRET` values must match. Laravel calls `https://abdulwahidmotors.com/api/revalidate` after SEO edits.
- **CDN:** enable it for `abdulwahidmotors.com`. For the API subdomain, leave it off, or make sure API responses are not cached (Laravel sends `Cache-Control: no-cache, private` by default).

## D. Smoke test

```bash
curl -s https://api.abdulwahidmotors.com/up                         # Laravel health
curl -s "https://api.abdulwahidmotors.com/api/v1/seo/routes/home?locale=ar" | head -c 300
curl -s https://abdulwahidmotors.com/sitemap.xml | head -c 300
curl -s -X POST https://abdulwahidmotors.com/api/revalidate -H "x-revalidate-secret: <secret>" \
     -H 'Content-Type: application/json' -d '{"tags":["seo"]}'        # -> {"revalidated":["seo"]}
```

In a browser: view the source of a car page and confirm `<title>`, `og:*`, `hreflang` and the JSON-LD `<script>` are in the HTML.

## Later deploys

- Frontend: `git push`. Hostinger rebuilds.
- Backend: `ssh` in, `cd ~/domains/api.abdulwahidmotors.com/laravel && bash deploy.sh`

## Backups

Hostinger's daily backups cover files and databases. Before any migration that changes or drops columns, also take a manual DB export (hPanel → **Databases → phpMyAdmin → Export**).


## Before you go live

See [SECURITY-AND-GO-LIVE.md](SECURITY-AND-GO-LIVE.md): the audit results, every environment variable (frontend and Laravel), the extra migrations and seeders, mail and Google sign-in setup, and a pre-launch checklist.

# Security audit and go-live checklist

Scope: the Next.js site, the Laravel API, and every flow between them (catalogue, car reservation requests, spare-part orders, maintenance bookings, workshop job cards, staff admin, customer account, sign-in, contact form).

**How this was checked.** The frontend was built and driven in a real browser against a local stand-in for the API (checkout, booking, account, admin, auth, uploads, language and direction), with axe-core accessibility scans. The Laravel PHP was read line by line and syntax-checked, but **never executed**: there was no PHP here. Everything marked "Laravel" below still needs a run on your real environment.

## 1. What is protected, and how

| Area | How it works | Status |
|---|---|---|
| Customer and staff session | Sanctum token in an `httpOnly`, `SameSite=Lax`, `Secure` (production) cookie. The browser never sees the token; the Next proxies add it. Verified: the token never appears in any response body. | Verified |
| Logout / reset | Logout revokes the token. A password reset revokes every token and sends a "password changed" email. | Laravel: untested |
| Staff access | Every `/admin/*` route sits behind `auth:sanctum` plus a permission (`orders.manage`, `payments.confirm`, `parts.manage`, `stock.adjust`, `vehicles.manage`, `categories.manage`, `job_cards.*`, `appointments.manage`, `pdi.manage`, `battery.inspect`, `seo.manage`). Staff pages also hide what the role can't use. Verified: a technician or sales user is redirected away from other sections and gets 403 from the proxy. | Frontend verified, Laravel untested |
| Staff two-factor | Password, then a TOTP code (RFC 6238, checked against the official test vectors). Codes can't be reused, secrets are encrypted with APP_KEY, recovery codes are stored hashed. Turning it off or replacing recovery codes needs the password and a fresh code, and is refused while AWM_2FA_REQUIRED=true. | Algorithm verified, Laravel untested |
| Google sign-in | The Google ID token is verified by Laravel (audience = your client ID, issuer, verified email, expiry). **Staff accounts are refused**: staff must use their password. | Laravel: untested |
| Customer data | All `/account/*` queries go through `$request->user()` relations, so a customer can only ever read their own orders, cars, invoices and reports. | Read and confirmed |
| Guest orders | A guest proves ownership with order number + the phone entered at checkout. The comparison is now digits-only and constant-time, and the endpoints are rate limited. | Fixed in this PR |
| Technicians | A technician can only change or complete job cards assigned to them (or unassigned ones, which they then take). Managers can act on any. | Fixed in this PR |
| Cross-site requests | Cookies are `SameSite=Lax`. In addition, every state-changing proxy (`/api/admin`, `/api/shop`, `/api/auth/*`, appointment cancel) now rejects a request whose `Origin` is another site. Verified with a forged Origin: 403. | Fixed in this PR |
| Uploads | Receipts: jpg/png/pdf, 5 MB, stored on the private disk, served to staff only with `nosniff` and a sandbox CSP. Car and part photos: jpg/png/webp, 5 MB. Brochures: PDF only, 15 MB. All get random file names. | Laravel: untested |
| Injection | No user input reaches raw SQL; no controller passes `$request->all()` to a model; JSON-LD escapes `<`. | Read and confirmed |
| Headers | `Strict-Transport-Security`, `Permissions-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a baseline CSP (no plugins, no `<base>` or form hijacking, no framing by other sites). Scripts are not restricted, so Next.js, Google sign-in and Google Maps keep working. | Fixed in this PR |
| Revalidate hook | Secret compared in constant time. | Fixed in this PR |
| Rate limits (Laravel) | login 10/min, register 5/min, forgot/reset password 5/min, Google 10/min, contact 5/min, checkout 10/min, pay 20/min, receipt upload 10/min, appointment booking 5/min, admin uploads 30/min. | Laravel: untested |
| Hidden prices | When the price is hidden Laravel sends `null` (never 0), JSON-LD omits it, and such a part can't be added to the cart. | Frontend verified |

## 2. Data flows checked

1. **Car reservation / spare-part request** (default `request` mode): cart → checkout → "request received" page. Nothing is paid on the site. Sales calls the customer, then records the payment in **Admin → Orders → Record payment received**. The existing online payment page still works if you set `NEXT_PUBLIC_CHECKOUT_MODE=online`.
2. **Maintenance booking:** the customer picks branch, day and an exact slot. Laravel only accepts a slot that is in opening hours, in the future, at most 30 days ahead, and under capacity (checked under a lock, so two people can't take the last place). Staff confirm, cancel, mark no-show, or check in (which opens a job card for linked customers).
3. **Workshop:** job card → start / waiting for parts / complete with invoice; technicians only touch their own cards; managers assign.
4. **Admin:** orders, payments (receipt viewer), cars (photo, PDF catalogue, price toggle), parts (stock log), categories, appointments, job cards.
5. **Customer account:** orders and tracking, cars and service history, invoices, battery reports, appointments.
6. **Language and direction:** Arabic and English each have exactly 1,228 message keys with matching placeholders; no left/right CSS is used (only start/end), so RTL/LTR follow the locale on every page, including admin.

## 3. Known gaps and recommendations

- **Two-factor login for staff is on.** Staff must set up an authenticator app (Google/Microsoft Authenticator, Authy, 1Password) the first time they log in; after that each login needs a 6-digit code (or a one-time recovery code). Five wrong codes lock the second step for 15 minutes. If someone loses their phone and recovery codes, an administrator with server access runs `php artisan awm:2fa-reset their@email`. Customers are not asked for a code.
- **No CAPTCHA** on the contact, register or booking forms. They have a honeypot (contact) and rate limits; add Cloudflare Turnstile or reCAPTCHA if spam appears.
- **`trustProxies('*')`** means rate limits read the client IP from `X-Forwarded-For`. Keep the API reachable only through Hostinger's proxy/CDN so that header can't be forged.
- **Contact messages** are stored in `contact_messages` and mailed, but there is no admin screen for them yet.
- **Stock is one total per part** (no per-branch stock). Splitting it by branch needs a schema change.
- **PHP has not run.** Run `php artisan route:list`, the migrations, and one pass through each flow on a staging copy before launch.
- Guest order access depends on the phone number; keep order numbers out of public places.
- Take a database backup before every migration (hPanel backups are daily, not instant).

## 4. Environment variables

**Frontend (Hostinger Node.js app)**

| Variable | Value |
|---|---|
| `API_URL_INTERNAL` | `https://api.abdulwahidmotors.com/api/v1` |
| `NEXT_PUBLIC_API_URL` | `https://api.abdulwahidmotors.com/api/v1` (https: the image allow-list uses it) |
| `NEXT_PUBLIC_SITE_URL` | `https://abdulwahidmotors.com` |
| `REVALIDATE_SECRET` | long random string, same as Laravel |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Web client ID (optional; hides the button when empty) |
| `NEXT_PUBLIC_CHECKOUT_MODE` | `request` (default) or `online` |

`NEXT_PUBLIC_*` values are baked in at build time: change them, then redeploy.

**Laravel (`.env` on the API site)**

```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.abdulwahidmotors.com
FRONTEND_URL=https://abdulwahidmotors.com
REVALIDATE_SECRET=<same as frontend>
GOOGLE_CLIENT_ID=<same as NEXT_PUBLIC_GOOGLE_CLIENT_ID>
AWM_2FA_REQUIRED=true                  # staff must use an authenticator app (default)

MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USERNAME=info@abdulwahidmotors.com
MAIL_PASSWORD=<mailbox password>
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS=info@abdulwahidmotors.com
MAIL_FROM_NAME="Abdul Wahid Motors"

# where the website contact form delivers (defaults shown)
AWM_MAIL_INFO=info@abdulwahidmotors.com
AWM_MAIL_SALES=sales@abdulwahidmotors.com
AWM_MAIL_PARTS=parts@abdulwahidmotors.com
AWM_MAIL_MANAGEMENT=management@abdulwahidmotors.com
```

Set up SPF and DKIM for the domain in hPanel (Emails → DNS) so password-reset and contact mails don't land in spam.

## 5. Commands after deploying this code

```bash
php artisan migrate --force                       # contact_messages, users.google_id, brochure_path + show_price, two-factor columns
php artisan db:seed --class=PaymentGatewaySeeder --force   # adds the hidden "in person" payment method
php artisan storage:link                          # photos and PDF catalogues are served from storage/app/public
php artisan optimize
```

PHP limits (hPanel → PHP Configuration): `upload_max_filesize` and `post_max_size` at least `16M` (the PDF catalogue limit is 15 MB).

## 6. Google sign-in setup

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID → Web application**.
2. **Authorized JavaScript origins:** `https://abdulwahidmotors.com` (and `http://localhost:3000` for local tests). No redirect URI is needed.
3. Put the client ID in both `GOOGLE_CLIENT_ID` (Laravel) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (frontend), then redeploy the frontend.

## 7. Pre-launch checklist

- [ ] `APP_DEBUG=false`, strong `APP_KEY`, `.env` outside the web root and not readable by others.
- [ ] Log in as the first admin and finish the two-step setup; save the recovery codes somewhere safe. Do this before creating other staff accounts.
- [ ] The first admin has a strong password; `ADMIN_EMAIL` / `ADMIN_PASSWORD` removed from `.env` after seeding.
- [ ] Staff accounts created with the least role they need (`sales`, `technician`, `inventory`).
- [ ] SMTP works: send a password reset and a contact-form message to yourself.
- [ ] Place a test reservation request and a test maintenance booking; confirm them in the admin; record a payment.
- [ ] Upload a car photo and a PDF catalogue; open the car page in Arabic and English.
- [ ] Hide the price on one car and one part; check "Contact us for price".
- [ ] Real Instagram URL and WhatsApp number in `src/lib/site.config.ts`; exact map pins in `branchMaps`.
- [ ] `https://abdulwahidmotors.com/sitemap.xml` and `/robots.txt` load; submit the sitemap in Google Search Console.
- [ ] Backups: confirm Hostinger daily backups are on; export the database once before launch.

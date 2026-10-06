# Design implementation notes

Screens built from the Figma exports so far:

| Figma frame | Route | Notes |
|---|---|---|
| 1:21749 Vehicles inventory (+ 1:2 status panel) | `/admin/vehicles`, `/admin/vehicles/new`, `/admin/vehicles/[id]` | Edit form has no Figma frame; built in the same system |
| 1:20349 Spare parts & inventory | `/admin/parts`, `/admin/parts/new`, `/admin/parts/[id]` | |
| 1:21010 Billing & customer management | `/admin/invoices` | Customer CRM list/profile screens still to build |
| 1:18607 SEO & meta settings | `/admin/seo` | |
| 1:19201 Cart & checkout flow | `/checkout` | |
| 1:19812 Order confirmation | `/checkout/result` | |
| (no frame yet) | `/login` | Interim, replace when the login frame is exported |
| (no frame) | `/admin` overview | Built from dashboard API in the same system |

## Deliberate deviations from the mockups

These keep the site accurate for a Damascus business and inside the brief. Apply the same rules to the remaining screens.

1. **Saudi content replaced.** The mockups show Riyadh/Khurais branches, SAR prices, 15% VAT, ZATCA tax QR codes, Saudi national-address fields, mada/SADAD, SAMA references, +966 numbers and `abdulwahid-byd.sa`. The build uses the Sahnaya and Kafr Sousa branches, USD/SYP, Syrian phone formats, the payment methods enabled in the admin, and no VAT/e-invoicing blocks.
2. **No card fields on the site.** The checkout mockup collects card number, expiry and CVV on the page. That must never happen: card entry belongs on the payment provider's hosted page. Customers choose a method after the order is created; offline methods show transfer instructions and a receipt upload.
3. **No invented numbers.** Figures with no data source were replaced with real metrics from the system:
   - Google CTR, rankings and "indexed pages" → our own SEO audit (URLs, custom meta, missing descriptions, title length).
   - Lift occupancy, workshop capacity → not shown.
   - Customs shipments, purchase orders, insurance-claim tabs → not shown.
   - Turnover days → not shown.
4. **Fonts.** Headings in the mockups appear to use a Naskh-style face, which the brief prohibits. The build uses Tajawal (Arabic) + Montserrat (Latin), geometric, with IBM Plex Mono for codes and figures as the mockups do.
5. **Confirmation wording follows payment state.** "Your order is confirmed" only when payment is captured; with transfers it says the order is placed and awaiting payment confirmation.
6. **Ownership steps.** Saudi steps (Absher, Tamm platform) became "ownership transfer and registration".
7. **Top-bar button.** The admin mockups show "+ New job card"; the job-card board isn't built yet, so the bar shows "Add a car" until then.
8. **"Book a test drive" CTA** links to `/contact?topic=test_drive`. There is no test-drive booking in the system; appointments cover service visits only. Decide whether test drives should become an appointment type.

## Design system (in code)

- Tokens: `frontend/src/app/globals.css` (red `#d90429`, black `#1c1b1b`, surface, line, muted; square corners; no shadows; no gradients).
- Components: `frontend/src/components/ui/primitives.tsx` (Button, Kpi/KpiStrip, Badge, TabLinks, Field/Input/Select, PageHeader, Pagination), `Icon.tsx`.
- Layout logic uses logical properties (`ms-`, `ps-`, `border-s`, `start-`), so every screen mirrors correctly between Arabic and English without separate styles.

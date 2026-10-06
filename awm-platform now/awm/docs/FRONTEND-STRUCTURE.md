# Next.js project structure (App Router)

```
frontend/
├── next.config.ts
├── tailwind.config.ts            # flat tokens only: red / black / white, no gradients
├── package.json                  # next, react, zustand, next-intl, tailwindcss
├── public/
│   ├── fonts/                    # self-hosted geometric Arabic + Latin faces
│   └── brand/                    # AWM / BYD Authorized logo SVGs
├── messages/
│   ├── ar.json
│   └── en.json
└── src/
    ├── i18n/
    │   ├── routing.ts            # locales: ['ar','en'], defaultLocale: 'ar'
    │   ├── request.ts
    │   └── navigation.ts
    ├── middleware.ts             # locale detection + admin auth guard
    ├── app/
    │   ├── sitemap.ts            # builds sitemap.xml from Laravel /seo/sitemap
    │   ├── robots.ts
    │   └── [locale]/
    │       ├── layout.tsx        # sets <html lang dir>, mounts <CartHydrator/> + <CartDrawer/>
    │       │
    │       ├── (site)/           # PUBLIC WEBSITE
    │       │   ├── page.tsx                      # Home
    │       │   ├── about/page.tsx                # من نحن: history, vision, mission, values
    │       │   ├── services/page.tsx             # منظومة الخدمات
    │       │   ├── contact/page.tsx              # branches + Google Maps
    │       │   ├── vehicles/
    │       │   │   ├── page.tsx                  # BYD catalogue
    │       │   │   └── [slug]/page.tsx           # generateMetadata + Vehicle JSON-LD
    │       │   ├── parts/
    │       │   │   ├── page.tsx
    │       │   │   └── [slug]/page.tsx           # generateMetadata + Product JSON-LD
    │       │   └── checkout/
    │       │       ├── [flow]/page.tsx           # spare_part | vehicle_reservation | maintenance_invoice
    │       │       └── result/page.tsx
    │       │
    │       ├── (account)/account/                # CUSTOMER AREA
    │       │   ├── orders/page.tsx
    │       │   ├── vehicles/page.tsx             # owned vehicles
    │       │   └── invoices/page.tsx             # unpaid service invoices -> "add to cart"
    │       │
    │       └── (admin)/admin/                    # ADMIN / CRM (mirrors the Figma sidebar)
    │           ├── layout.tsx                    # sidebar + top bar, RTL-aware
    │           ├── page.tsx                      # الرئيسية ومؤشرات الأداء (dashboard)
    │           ├── vehicles/                     # أسطول مركبات BYD  <- Figma screen lives here
    │           │   ├── page.tsx                  # list: KPI strip, filter tabs, rows
    │           │   ├── new/page.tsx
    │           │   └── [id]/edit/page.tsx
    │           ├── parts/                        # مستودع قطع الغيار والبطاريات
    │           ├── job-cards/                    # لوحة الصيانة كانبان (kanban)
    │           ├── customers/                    # إدارة العملاء والفواتير
    │           ├── pages/                        # المحتوى وإدارة الصفحات
    │           ├── seo/                          # محركات البحث وإعدادات SEO
    │           ├── payments/                     # gateways + offline confirmations
    │           └── settings/                     # الإعدادات والربط التقني
    │
    ├── components/
    │   ├── ui/                   # Button, Input, Toggle, Badge, Tabs, DataRow (flat, square, no shadows)
    │   ├── layout/               # Header, Footer, LanguageSwitcher
    │   ├── cart/
    │   │   ├── CartDrawer.tsx    # slide-over, slides from the inline-end edge (right in LTR, left in RTL)
    │   │   ├── CartLine.tsx
    │   │   └── AddToCartButton.tsx
    │   ├── checkout/             # PaymentMethodPicker, CustomerForm, BankTransferProof
    │   ├── seo/                  # JsonLd.tsx
    │   └── admin/                # Sidebar, KpiStrip, ProductRow, StatusToggle, StockStepper
    │
    ├── store/
    │   ├── cartStore.ts          # Zustand + persist (localStorage)
    │   └── CartHydrator.tsx
    │
    ├── lib/
    │   ├── api/
    │   │   ├── client.ts         # browser fetch wrapper (NEXT_PUBLIC_API_URL)
    │   │   ├── server.ts         # SSR fetch wrapper (API_URL_INTERNAL), tag-based revalidation
    │   │   ├── cart.ts           # sync local cart <-> /cart
    │   │   └── seo.ts            # getSeo(routeKey | model) -> Metadata
    │   ├── seo/
    │   │   ├── buildMetadata.ts  # Laravel SEO payload -> Next Metadata
    │   │   └── jsonLd.ts
    │   └── format.ts             # money + numerals (Arabic-Indic vs Latin)
    │
    └── types/
        ├── api.ts
        └── seo.ts
```

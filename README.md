# Elite Fashions — online store

Online store for **Elite Fashions**, 188 Annapoorani Complex, Mettur Road, Erode. Shoppers browse girls' festive and party wear, keep a wishlist, fill a cart, and **order on WhatsApp**. The owner, **Sivaani**, runs products, orders, payments and bills from a private admin panel.

## What's inside

| Area | Features |
| --- | --- |
| Store | Home with festive banner, shop with filters (category, size, brand, colour, price), search by name or design no., product pages with colour variants, zoom, size stock |
| Shopper | Wishlist and cart saved on the phone, checkout form, WhatsApp order message, private order-status page with bill download |
| About | Meet the owner (Sivaani, photo, story), store address, timings, map |
| Admin (`/admin`) | Secure login, dashboard (orders today, awaiting payment, sales, low stock), products with photos/sizes/stock, orders with status flow, mark-as-paid, numbered PDF bills, one-tap WhatsApp messages, store settings |
| Bills | `INV/2026-27/0001` numbering per financial year, amount in words, GST split (CGST/SGST) when a GSTIN is set |

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL (Supabase) · Supabase Auth & Storage (optional) · pdf-lib · Sharp · Zod.

## Run it on your computer

Needs Node.js 20.9+ and a Postgres database (your Supabase project).

```bash
npm install
cp .env.example .env.local      # then fill it in (see below)
npm run db:setup                # creates tables, loads the 21 dresses, creates the owner login
npm run dev                     # http://localhost:3000  (admin: /admin)
```

### `.env.local`

| Variable | What to put |
| --- | --- |
| `DATABASE_URL` | Supabase → **Connect** → connection string. Encode special characters in the password (`@` → `%40`). Use the **Transaction pooler** (port 6543) on Vercel; the direct or **Session pooler** string locally. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API. When set, the owner signs in with **Supabase Auth**. |
| `SUPABASE_SECRET_KEY` | Supabase secret key (server only). Used by `db:seed` to create the owner login and the `product-images` bucket, and for photo uploads. **Never** expose it in the browser. |
| `STORAGE_DRIVER` | `supabase` to store product photos in Supabase Storage, `local` for disk (dev / VPS). |
| `AUTH_SECRET` | 32+ random characters (`openssl rand -base64 48`). |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Sivaani's login. The password must be changed on first sign-in. Quote it if it contains `#`. |
| `STORE_WHATSAPP` | Shop WhatsApp number with country code, digits only (e.g. `919876543210`). Editable later in Settings. |
| `NEXT_PUBLIC_SITE_URL` | The site address (used in WhatsApp messages and bill links). |

Security: every table has row-level security enabled with no policies, so Supabase's public Data API (publishable key) cannot read orders or logins. The app connects to Postgres directly.

## Deploy (Vercel + Supabase)

1. Import the GitHub repo in Vercel.
2. Add the variables above (use the Transaction pooler `DATABASE_URL`, `STORAGE_DRIVER=supabase`, your real domain in `NEXT_PUBLIC_SITE_URL`).
3. Run `npm run db:setup` once from your computer against the production database.
4. Deploy, open `/admin`, sign in, change the password, then go to **Settings** and fill in WhatsApp number, UPI ID, timings, GSTIN (if registered).

## Daily use (owner)

1. A shopper orders on the site; WhatsApp opens on their phone with the order typed out and sends it to you.
2. In **Admin → Orders**, open the order and tap **Send payment request (UPI)**.
3. When the money arrives, enter it under **Mark as paid**. Stock is reduced and a bill is created.
4. Tap **Send bill on WhatsApp**. Then mark **Packed → Shipped / Ready for pickup → Delivered**; the shopper's status page updates.

## Quality checks

```bash
npm run typecheck && npm run lint && npm test     # 22 unit tests
npm run build && npm start                         # then, with Playwright available:
node audit/storefront.cjs   # 49 checks: pages, filters, mobile layout, SEO, cart
node audit/checkout.cjs     # 21 checks: server-side pricing, tampering, stock, private links
node audit/admin.cjs        # 29 checks: guards, lock-out, forged cookies, uploads, product edits
node audit/orders.cjs       # 26 checks: payments, stock, bill numbers, PDF, status flow
node audit/settings-about.cjs  # 19 checks: About page, settings, security headers
```

The audits use a local test database (`postgres://postgres@127.0.0.1:5433/elite`); don't run them against production.

## Notes

- The starting 21 products use **placeholder prices and 3 pieces per size**. Set real prices and stock before launch.
- GST rates (5% up to ₹2,500 per piece, 18% above, from 22 Sep 2025) are settings, not code; confirm with your accountant.

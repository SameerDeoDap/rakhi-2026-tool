# Rakhi 2026 Project — DeoDap P&L Tracker

Internal web app for tracking the **true profit & loss of the Rakhi 2026 season** at DeoDap (Indian e-commerce). React app that runs in two modes: **shared team mode** (Supabase cloud database — everyone sees the same live data) or **local mode** (browser localStorage fallback — no backend required). See [Go online with shared data](#go-online-with-shared-data).

## Login

| Role | Password | Access |
|------|----------|--------|
| **Admin** (Nikul) | `Nikul@2026` | Full access — users/permissions, categories & merge, Excel import, duplicate review/approve/merge, entry corrections, all dashboards, JSON export/import, settings |
| **Team** | `rakhi2026` | Data entry (manual + Excel import) and all dashboards. Cannot manage categories, resolve duplicates, or open settings |

## Tech stack

- **React 19 + TypeScript + Vite 7**
- **Tailwind CSS 3 + shadcn/ui** (Radix primitives)
- **Recharts** for dashboard charts
- **SheetJS (`xlsx`)** for Excel template generation + import pipeline
- **Supabase** (`@supabase/supabase-js`) for the optional shared team database with realtime sync
- **React Router 7**, **lucide-react** icons

## Run locally

```bash
npm install
npm run dev        # Vite dev server (default port 3000; use -- --port N to change)
```

## Build

```bash
npm run build      # tsc -b && vite build → dist/
npm run preview    # preview the production build
```

## End-to-end verification

```bash
node scripts/verify.mjs   # starts dev server, drives Chrome headless (puppeteer-core),
                          # runs 30 checks across both roles, then kills the server
```

## Features

- **CEO Dashboard** — 16 KPIs (sales, marketplace income, bank receipts, goods cost, inventory consumed, closing stock, unsold %, gross/net profit, margin %, TCS/recoverables, receivables/payables), transparent profit formula, charts
- **Income** — Marketplace → Seller Account → Transaction hierarchy; Bank Receipt / TCS / Recoverables kept separate and never counted as revenue
- **Expenses** — Goods (category → product type → qty × rate, vendor optional) + Services (14 defined categories, Common vs Marketplace-specific allocation)
- **Inventory** — Opening + Purchases − Closing = Inventory Consumed; unsold %, sell-through %, category & product-type leftover stock
- **Excel Import** — upload → preview → column mapping → validation → duplicate highlighting → row-level correction → import; downloadable templates for Income, Goods, Services, Advertising, HR, Opening Stock, Closing Stock
- **Duplicate detection** — amount/date/marketplace/seller/category/reference/settlement/bank-ref/description similarity; admin queue (Confirm Duplicate / Mark Valid / Ignore / Correct Entry) with full audit history; never auto-deletes
- **Marketplace P&L** — consolidated per marketplace with seller-account drill-down; common expenses allocated by Revenue % / Orders % / Units % / Manual % (never double-counted)
- **Post-Mortem** — auto-generated findings (excess purchasing, high closing stock, poor sell-through, high ad spend, best/worst marketplaces, unusual expenses) + "What worked / What didn't / Where we lost money / Rakhi 2027 recommendations"

## Profit formula

```
Net Profit = Marketplace Sales Income (excl. TCS & recoverables)
           − Inventory Consumed (Opening Stock + Purchases − Closing Stock)
           − Service Expenses − Advertising − HR/Manpower (incl. allocated common costs)
```

## Data storage

The app runs in **two modes**, chosen automatically at startup:

- **Shared mode** — if the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set (see below), all data lives in a **Supabase cloud database**. Every team member sees the same live data; changes sync in realtime (with a 15-second polling fallback). The sidebar header shows a green **"Shared · team data"** badge.
- **Local mode** — if those variables are not set, everything falls back to **browser localStorage** (key `rakhi2026.data.v2`) exactly as before. The badge shows **"Local only"**.

Either way, use **Settings → Export data (JSON)** / **Import data (JSON)** to move data between machines or back it up. The app starts **empty** (standard category framework pre-loaded, zero transactions).

## Go online with shared data

No coding needed — about 15 minutes, one time. After this, the whole team works on the same live numbers.

1. **Create a free Supabase project.** Go to [supabase.com](https://supabase.com), sign up, and click **New project** (the free tier is plenty). Pick any name (e.g. `rakhi-2026`) and a database password — save that password somewhere safe.
2. **Create the tables.** In the Supabase dashboard, open **SQL Editor** (left sidebar) → **New query**. Open the file [`supabase/schema.sql`](supabase/schema.sql) from this repo, copy its **entire** contents, paste it into the editor, and click **Run**. You should see "Success. No rows returned" — that's correct.
3. **Copy your two keys.** In the Supabase dashboard go to **Settings → API**. Copy the **Project URL** and the **anon public** key (the long one labelled `anon` / `public`).
4. **Deploy on Netlify.**
   - Go to [netlify.com](https://netlify.com), sign up (free), click **Add new site → Import an existing project → GitHub**, and pick the `rakhi-2026-tool` repository. Netlify auto-detects the build settings from `netlify.toml` — don't change them.
   - Before clicking Deploy, add two **environment variables** (Site configuration → Environment variables):
     - `VITE_SUPABASE_URL` = your Project URL from step 3
     - `VITE_SUPABASE_ANON_KEY` = your anon public key from step 3
   - Click **Deploy**. Netlify gives you a live link (e.g. `https://rakhi-2026.netlify.app`) — share that link plus the app passwords with the team.
5. **Confirm it worked.** Open the deployed link and log in. The sidebar header should show the green **"Shared · team data"** badge. Enter a test record on one computer and watch it appear on another within seconds.

**Security note (read once):** anyone holding the anon key can read and write this database directly (row-level security is intentionally open because the app itself is behind the password gate and it's an internal tool). The key is visible in the deployed site's code — that's normal for this setup and acceptable for an internal team tool. If the key ever leaks beyond the team, go to Supabase **Settings → API**, rotate the key, and update the Netlify environment variable. For a public-facing product, you'd lock down the RLS policies in `supabase/schema.sql`.

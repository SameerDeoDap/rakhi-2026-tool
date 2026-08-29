# Rakhi 2026 Project — DeoDap P&L Tracker

Internal web app for tracking the **true profit & loss of the Rakhi 2026 season** at DeoDap (Indian e-commerce). Client-only React app with browser localStorage persistence — no backend required.

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

All data lives in **browser localStorage** (key `rakhi2026.data.v2`). The data layer (`src/lib/db.ts`) is the single seam for reads/writes — swap it for API calls to add a backend later. Use **Settings → Export data (JSON)** / **Import data (JSON)** to move data between machines or back it up.

The app starts **empty** (standard category framework pre-loaded, zero transactions).

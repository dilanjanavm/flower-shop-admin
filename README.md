# Sithuliya Flora — Owner & Staff Panel

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, with light and dark themes. It runs on mock data.

```bash
npm install
npm run dev   # http://localhost:3001
```

To sign in, choose Owner, Florist or Rider and enter any 8+ character password. Owners then do a 2FA step, where any 6 digits works.

## Screens (SRS UI-04 / UI-05)

| Route | Purpose |
|---|---|
| `/login` | Staff login. Mandatory 2FA for the owner, lock after 5 failed attempts |
| `/` | KPI tiles, revenue trend, today by slot, unpaid-soon flags, slip and quote queues, low stock |
| `/orders` | Kanban board you can drag along legal transitions only, or a list. Sorted by date, then slot, then creation time. Phone orders via `?new=1` |
| `/orders/[id]` | Slip review, workflow actions, rider assignment, photos, notes, timeline, refunds, and printables (A5 job sheet, A6 card with a font choice, A5 waybill without prices) |
| `/payments` | Bank-slip approval queue |
| `/quotations`, `/quotations/[id]` | Quotation inbox. Price each stem, set wrap, delivery, discount and validity, then send or decline |
| `/products`, `/products/[id]` | Product CRUD with tiers, taxonomy, images, SEO, and one-click availability |
| `/gallery` | Custom-bouquet flowers and fillers (show or hide), plus wraps, ribbons and add-ons |
| `/inventory` | Items, FEFO batches, wastage log, stock-take and the movement ledger (information only) |
| `/delivery` | Rider dispatch board, 14-day slot capacity grid, zones, blackouts and peak days |
| `/customers` | Customer directory with LTV, order history, block or unblock |
| `/coupons`, `/reviews`, `/reports`, `/staff`, `/audit`, `/settings` | Promotions, review moderation, analytics with CSV export, staff and sessions, audit log, business rules, bank details and templates |
| `/rider` | Mobile rider view: call, navigate, a proof-of-delivery photo required to finish, and a failure reason |

`src/lib/store.tsx` checks every status change against the SRS 6.1 state machine and writes an audit row for each one.

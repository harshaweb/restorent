# Production setup

## Vercel frontend

Use the repository root as Vercel's Root Directory (leave it empty in project settings).
Framework: Vite. Install: `npm ci`. Build: `npm run build`. Output: `dist`. Node.js: 24.x.

The website is `/`, and the admin page is available at `/admin`, `/admin/`, and `/admin.html`.
API requests are routed to `api/proxy.mjs`, which forwards them to the persistent Node backend.
Missing backend configuration returns a JSON error rather than homepage HTML.

Set `RESTO_BACKEND_URL` in Vercel to the backend's public origin, for example
`https://your-backend.example.com`. Do not use the Vercel frontend URL or add `/api`.
Redeploy after changing environment variables.

Vercel Functions cannot persist this application's local SQLite database.
Host the Node backend on a service with a persistent disk, or migrate the database to a hosted service.
See https://vercel.com/kb/guide/is-sqlite-supported-in-vercel.

## Persistent Node backend (or a single full-site Node deployment)

Use Node.js 24 and this repository root.

1. Install with `npm ci` and build with `npm run build`.
2. Set `ADMIN_EMAIL` and a new, private `ADMIN_TOKEN`.
3. Set `DATABASE_PATH` to a SQLite file on a persistent disk, for example `/data/resto.sqlite`.
4. Set `PORT` if your host requires one.
5. Start with `npm run start:prod`.
6. Check `/api/health` for a JSON response containing `ok: true`.

A single Node deployment also serves `dist`, so it can host the entire website without Vercel.
When no custom database path is supplied, local storage stays in `resto/server/resto.sqlite`.
New databases receive the menu from `resto/server/seed-menu.json`, which contains no customer records.
Existing local databases and legacy migration data are preserved.
To move existing data, stop the backend, back up the SQLite database, and copy it to the configured persistent path.
Keep only one backend instance writing to the same local disk.

`.env` files are loaded by the start commands and are excluded from Git and Vercel uploads.
Production admin authentication requires `ADMIN_TOKEN` from the environment; it does not use the bundled development token file.
Do not commit database files, customer exports, or admin token files.
The included ignore rules do not remove files already tracked in Git: untrack them and rotate any previously published token before deploying.

## Payments

Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` on the Node backend for online payments.
Production rejects online payment attempts when these credentials are missing.
Local development offers a clearly identified demo gateway; `ENABLE_DEMO_PAYMENTS=true` explicitly enables it in production for testing.
Use `ENABLE_DEMO_PAYMENTS=false` for the live restaurant.

Checkout totals are calculated from stored menu prices, quantities, active dashboard coupons, and configured delivery fee and tax. Pickup orders have no delivery fee.
Razorpay signatures are verified on the backend, and verified transactions can be used only once for a matching amount.
Cash, counter card, manual UPI, and bank transfer orders remain pending payment until the restaurant confirms receipt.
The website does not collect card numbers or expiry dates; online card payments use Razorpay Checkout.

## Checks

```sh
npm run typecheck
npm run build
npm test
npm audit
```

Integration tests cover static pages, asset routing, admin access, menu edits, website content,
checkout totals, payment replay protection, production demo settings, reservations, subscriptions, availability, manual payment records, restaurant settings, coupons, and the Vercel proxy.
Live Razorpay payments and an actual Vercel deployment require configured accounts and credentials and are not exercised by these local tests.

The `resto/` subfolder also supports building and starting for compatibility, but the root project is the recommended deployment entry point.

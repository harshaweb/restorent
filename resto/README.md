# Amit's Food Hub

Use Node.js 24 and run commands from this repository root.

```sh
npm ci
npm run dev:full
```

Open http://127.0.0.1:5173/ for the website and http://127.0.0.1:5173/admin for admin.
Copy `.env.example` to `.env` and set your own `ADMIN_EMAIL` and `ADMIN_TOKEN` to log in.

```sh
npm run typecheck
npm run build
npm test
npm run start:prod
```

The production server serves the website, admin page, and API at http://127.0.0.1:3001/.
Tests use temporary databases and synthetic customers; they do not modify restaurant data.

See [PRODUCTION.md](PRODUCTION.md) for Vercel and persistent backend setup.

## Owner dashboard

Open `/admin` and sign in with the configured admin email and private token. In local development, the backend uses `resto/server/admin-token.txt` when `ADMIN_TOKEN` is not set; the default email is `karansingh972002@gmail`.

The dashboard supports:

- Sales overview, recent orders, and optional live refresh.
- Menu creation, editing, image uploads, custom categories, and availability.
- Order preparation statuses and confirmation of received cash or manual payments.
- Reservation statuses, customer history, subscriber removal, and CSV exports.
- Website headings, descriptions, buttons, and section visibility.
- Homepage offers and checkout coupons with discounts and minimum order amounts.
- Restaurant contact details, opening hours, branding, delivery fee, tax, and switches to pause online orders or reservations.

Changes are saved in SQLite and appear on the website after refresh. Razorpay payment records are verified by the gateway and cannot be manually overwritten. Marking a manual payment as paid records receipt; it does not charge or refund a customer.

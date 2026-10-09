# Amit's Food Hub Production Setup

This project is ready as a Node + Vite restaurant website with:

- Customer menu and search
- Cart and checkout
- Razorpay-style payment gateway with local demo mode
- Orders saved to SQLite
- Table reservations saved to SQLite
- Newsletter subscribers
- Separate protected admin page
- Admin menu editing, image editing, section editing, orders, reservations, and customer details

## Run Production Locally

1. Build the frontend:

```bash
npm run build
```

2. Start the production server:

```bash
ADMIN_EMAIL=karansingh972002@gmail ADMIN_TOKEN=your-private-token NODE_ENV=production npm start
```

3. Open:

- Website: http://127.0.0.1:3001/
- Admin: http://127.0.0.1:3001/admin.html

## Payment Gateway

The checkout includes a Razorpay-style payment gateway. For localhost, it runs in demo mode when Razorpay keys are empty. For live payments, set these environment variables before starting the server:

```bash
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

The server creates Razorpay orders in INR paise and verifies checkout signatures before marking payments paid.

## Database

Data is stored in:

```text
server/resto.sqlite
```

Keep a backup of this file before deploying or moving servers.

## Useful Commands

```bash
npm run dev:full      # frontend + backend development
npm run build         # production build
npm start             # serve built website and API
npm run prod          # build, then start server
```

# Pond & Puff — Fox Nut (Makhana) E-commerce Site

A full-stack store for selling makhana, built casual-brand style (think Feastables, but for fox nuts).

- **Backend:** Node.js + Express + MongoDB/Mongoose, JWT auth in httpOnly cookies
- **Frontend:** Plain HTML/CSS/JS (no build step) — 5 pages: Home, Shop, About, Sourcing, Profile
- **Extras:** cart drawer + checkout (slides over every page), product reviews, order history, saved addresses, admin-only product/order management via the API

```
makhana-shop/
├── server/      Express API (this is what you deploy/host)
└── client/      Static frontend (host anywhere: Netlify, Vercel, S3, or Express itself)
```

## 1. Backend setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env`:
- `MONGO_URI` — your MongoDB connection string (local, or a free MongoDB Atlas cluster for hosting)
- `JWT_SECRET` — generate a long random string, e.g. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `CLIENT_ORIGIN` — the URL(s) your frontend is served from (comma-separated). This must match exactly or the browser will block requests (CORS).
- `SECURE_COOKIES` — set to `true` once your site is served over HTTPS in production; keep `false` for local HTTP dev.

Then seed some sample products and an admin account:

```bash
npm run seed
```

This creates 6 sample products and an admin user (`admin@makhanashop.test` / `ChangeMe123!` — **change this password immediately** if you keep it, or just delete/recreate the user).

Run the API:

```bash
npm run dev      # with auto-restart (nodemon)
# or
npm start
```

The API runs on `http://localhost:5000/api` by default. Sanity check: `GET http://localhost:5000/api/health`.

## 2. Frontend setup

The frontend is plain static files — no npm/build step required. For local dev, just serve the `client/` folder with any static server, e.g.:

```bash
cd client
npx serve .
# or: python3 -m http.server 5500
```

By default the frontend calls the API at `http://localhost:5000/api` (set in `client/js/api.js`). To point it at a different backend (e.g. once deployed), either:
- Edit the `API_BASE` constant directly in `client/js/api.js`, or
- Add this **before** the `api.js` script tag on every page:
  ```html
  <script>window.MAKHANA_API_BASE = 'https://your-api-domain.com/api';</script>
  ```

## 3. Authentication, in plain terms

- Passwords are hashed with bcrypt before storage — the plaintext password is never saved.
- On login/register, the API sets a JWT in an **httpOnly cookie**, which JavaScript in the browser can't read — this is what protects the token from being stolen via a script injection on your site.
- Every request from the frontend uses `credentials: 'include'` so the cookie is sent automatically; you don't manage tokens manually on the frontend.
- Login/register are rate-limited (20 attempts / 15 min per IP) to slow down brute-force attempts.
- Cart contents live in the browser (`localStorage`) until checkout; at checkout, prices are **re-verified against the database** server-side — the frontend's prices are never trusted directly, which prevents someone from tampering with prices in dev tools.

## 4. Hosting it for real

A simple, cheap path:
- **Backend:** Render, Railway, or Fly.io (all have free/low tiers for small Node apps) + MongoDB Atlas free tier for the database.
- **Frontend:** Netlify, Vercel, or GitHub Pages — just drag in the `client/` folder.
- Point `client/js/api.js`'s `API_BASE` at your deployed backend URL, and set `CLIENT_ORIGIN` in the backend's `.env` to your deployed frontend URL. Set `SECURE_COOKIES=true` once both are on HTTPS.
- If you'd rather deploy both together from one server, `server.js` has a commented-out block that serves `client/` as static files from Express itself — uncomment it and skip the separate frontend host.

## 5. Becoming an admin (to add/edit products)

Product creation/editing/deletion and order status updates are API-only right now (no admin UI page was in scope) — hit them with a tool like Postman/Insomnia while logged in as a user with `role: 'admin'`:

- `POST /api/products` — create a product
- `PUT /api/products/:id` — update a product
- `DELETE /api/products/:id` — remove a product
- `GET /api/orders` — view all orders
- `PUT /api/orders/:id/status` — update an order's status

To make a user an admin, update their document directly in MongoDB: `role: 'admin'`. (An admin dashboard page is a natural next feature if you want one built later.)

## 6. What's deliberately out of scope (fast follow-ups you may want)

- Real payment gateway integration (Razorpay/Stripe) — `paymentMethod` currently just records the customer's choice; card/UPI aren't actually processed.
- Email confirmations for orders/signup.
- Image uploads (product images currently reference URLs — swap in Cloudinary/S3 when you have real product photos).
- An admin dashboard UI (the API supports everything needed; there's just no page for it yet).

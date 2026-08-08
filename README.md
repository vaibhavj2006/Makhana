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
```

Then seed some sample products and an admin account:

```bash
npm run seed
```
Run the API:

```bash
npm run dev      # with auto-restart (nodemon)
# or
npm start
```

The API runs on `http://localhost:5000/api` by default. 

## 2. Frontend setup

The frontend is plain static files — no npm/build step required. For local dev, just serve the `client/` folder with any static server, e.g.:

```bash
cd client
npx serve .
# or: python3 -m http.server 5500
```
## 6. What's deliberately out of scope (fast follow-ups you may want)

- Real payment gateway integration (Razorpay/Stripe) — `paymentMethod` currently just records the customer's choice; card/UPI aren't actually processed.
- Email confirmations for orders/signup.
- Image uploads (product images currently reference URLs — swap in Cloudinary/S3 when you have real product photos).
- An admin dashboard UI (the API supports everything needed; there's just no page for it yet).

# MarketNest Mini E-Commerce App

Vanilla HTML/CSS/JS storefront with an Express, MongoDB, and Mongoose backend.

## Features

- Product catalog with search, category filters, sorting, stock counts, and cart.
- Checkout flow that creates customer orders and reduces product inventory.
- Admin login with JWT authentication.
- Admin dashboard for creating, editing, deleting products, and updating order status.
- Image uploads served from the backend.

## Run

```bash
cd backend
npm start
```

The app runs at `http://localhost:5000`.

Default admin:

- Email: `admin@shop.com`
- Password: `admin123`

Set `MONGO_URI`, `PORT`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `DELIVERY_FEE` in `backend/.env` when needed.

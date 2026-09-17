# FundsWeb ERP — MERN Full-Stack Technical Case Study

A small ERP application for a manufacturing and supply company, covering the complete business workflow:

**Customer Enquiry → Quotation → Sales Order → Inventory Reservation → Dispatch**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, React Router, Axios |
| **Backend** | Node.js, Express 5, Zod (validation) |
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma |
| **Auth** | JWT (jsonwebtoken), bcryptjs |
| **Testing** | Jest, Supertest |

## Project Structure

```
fundsweb/
├── backend/           # Express API server
│   ├── prisma/        # Schema, migrations, seed
│   ├── src/
│   │   ├── config/    # DB connection, env config
│   │   ├── controllers/  # Request handlers + business logic
│   │   ├── middleware/   # Auth, RBAC, error handler
│   │   ├── routes/       # Express route definitions
│   │   └── utils/        # JWT helpers
│   ├── tests/         # Jest API tests
│   └── server.js      # Entry point
├── frontend/          # React SPA
│   └── src/
│       ├── components/   # Layout, ProtectedRoute
│       ├── context/      # AuthContext
│       ├── pages/        # Login, Enquiries, Quotations, SalesOrders
│       └── services/     # Axios API layer
└── docker-compose.yml # PostgreSQL container
```

## Prerequisites

- **Node.js** >= 18
- **Docker** (for PostgreSQL)
- **npm**

## Database Setup

### 1. Start PostgreSQL via Docker

```bash
docker-compose up -d
```

This starts PostgreSQL on `localhost:5432` with:
- Database: `fundsweb`
- User: `fundsweb`
- Password: `fundsweb123`

### 2. Run Migrations

```bash
cd backend
cp .env.example .env    # Already configured for Docker
npx prisma migrate dev --name init
```

### 3. Seed Data

```bash
npm run db:seed
```

Seeds: 2 users, 5 customers, 6 industrial products, and initial inventory.

## Environment Variables

### Backend (`backend/.env`)

```
DATABASE_URL="postgresql://fundsweb:fundsweb123@localhost:5432/fundsweb?schema=public"
JWT_SECRET="fundsweb-jwt-secret-key-change-in-production"
JWT_EXPIRES_IN="24h"
PORT=3000
NODE_ENV=development
```

## Running the Application

### Backend

```bash
cd backend
npm install
npm run dev
```

Server starts on `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:5173`

## Test Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@fundsweb.com | admin123 |
| **Sales** | sales@fundsweb.com | sales123 |

### Permissions

| Action | Admin | Sales |
|--------|-------|-------|
| Create customers/enquiries | ❌ | ✅ |
| Create quotations | ❌ | ✅ |
| Convert quotation → Sales Order | ❌ | ✅ |
| View all records | ✅ | ✅ |
| Manage inventory | ✅ | ❌ |
| Confirm Sales Orders | ✅ | ❌ |
| Process dispatch | ✅ | ❌ |

## Running Tests

```bash
cd backend
npm test
```

### Test Coverage

| # | Test | What it verifies |
|---|------|-----------------|
| 1 | Quotation total calculation | Backend correctly computes line amounts with discount + GST |
| 2 | Draft/Rejected quotation → SO blocked | Only ACCEPTED quotations can create Sales Orders |
| 3 | Duplicate SO prevention | Same quotation cannot generate multiple Sales Orders |
| 4 | Inventory over-reservation blocked | Cannot reserve more than available stock |
| 5 | Unauthorized access blocked | RBAC enforced at API level (SALES can't confirm orders) |
| 6 | Concurrent reservation (bonus) | Race condition: only one of two simultaneous reservations succeeds |

## API Documentation

### Authentication
- `POST /api/auth/login` — Login with email/password, returns JWT
- `GET /api/auth/me` — Get current user profile

### Customers
- `POST /api/customers` — Create customer (SALES)
- `GET /api/customers` — List all customers

### Products & Inventory
- `GET /api/products` — List products
- `GET /api/inventory` — View inventory with availability
- `PATCH /api/inventory/:productId` — Update physical stock (ADMIN)

### Enquiries
- `POST /api/enquiries` — Create enquiry with items (SALES)
- `GET /api/enquiries` — List enquiries
- `GET /api/enquiries/:id` — Get enquiry details

### Quotations
- `POST /api/quotations` — Create quotation (SALES)
- `GET /api/quotations` — List quotations
- `GET /api/quotations/:id` — Get quotation details
- `PATCH /api/quotations/:id/status` — Update status: SENT/ACCEPTED/REJECTED (SALES)
- `POST /api/quotations/:id/convert` — Convert to Sales Order (SALES)

### Sales Orders
- `GET /api/sales-orders` — List orders
- `GET /api/sales-orders/:id` — Get order details
- `POST /api/sales-orders/:id/confirm` — Confirm + reserve inventory (ADMIN)
- `POST /api/sales-orders/:id/dispatch` — Process dispatch (ADMIN)

## Key Technical Decisions

### Concurrency-Safe Inventory Reservation
Uses PostgreSQL `SELECT ... FOR UPDATE` with `SERIALIZABLE` isolation level inside a transaction. This ensures that simultaneous reservation requests are serialized at the database level, preventing race conditions.

### Backend-Computed Quotation Totals
The formula `lineAmount = qty × unitPrice × (1 - discount/100) × (1 + gst/100)` is always computed server-side. Frontend shows an estimate but the backend is the source of truth.

### Duplicate Sales Order Prevention
The `quotation_id` column in `sales_orders` has a `UNIQUE` constraint, preventing duplicate SOs at the database level (not just application level).

### Database CHECK Constraints
Inventory integrity is enforced via constraints: `physical_qty >= 0`, `reserved_qty >= 0`, and `reserved_qty <= physical_qty`.

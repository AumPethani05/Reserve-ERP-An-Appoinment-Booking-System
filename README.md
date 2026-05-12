# Reserve ERP Appointment Booking System (VaidyaLink)

VaidyaLink is a full-stack appointment booking and resource management platform for providers and patients. It supports multi-resource scheduling (turfs, chairs, rooms), role-based access, automated invoicing, and Razorpay-backed payments in a TypeScript + React monorepo.

```
# Terminal 1 — start the API server
pnpm --filter @workspace/api-server dev

# Terminal 2 — start the React frontend
pnpm --filter @workspace/vaidyalink dev
```

* * *

## Table of Contents

*   [Overview](#overview)
*   [Installation](#installation)
*   [Architecture](#architecture)
*   [Data Model](#data-model)
*   [API Architecture](#api-architecture)
*   [Component Reference](#component-reference)
*   [Backend Engine](#backend-engine)
*   [Configuration](#configuration)
*   [Known Limitations](#known-limitations)
*   [Contributing](#contributing)
*   [License](#license)

* * *

## Overview

VaidyaLink provides a two-sided booking flow:

* **Providers** create businesses, services, schedules, and bookable resources.
* **Patients** discover providers, select slots, and complete payments.
* **Automation** locks slots transactionally, creates invoices, and sends confirmation emails.

The frontend is a React SPA (Vite + Wouter + Tailwind) that communicates with a REST API built on Express + TypeScript, backed by MySQL.

* * *

## Installation

**Requirements**

* Node.js + **pnpm** (workspace uses pnpm and enforces it via `preinstall`)
* MySQL database
* Optional: Razorpay credentials and Gmail App Password for payments/emails

**1. Install dependencies**

```
pnpm install
```

**2. Database setup**

Create a MySQL database and apply the schema in `schema.mysql.sql`:

```
mysql -u <user> -p <database> < schema.mysql.sql
```

**3. Configure environment variables**

Create a `.env` file at the repository root (loaded by `artifacts/api-server/src/env.ts`):

```
DATABASE_URL=mysql://user:password@localhost:3306/vaidyalink
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
API_PORT=5000
LOG_LEVEL=info

# Payments + email (optional but required for real checkout)
RAZORPAY_KEY_ID=rzp_test_********
RAZORPAY_KEY_SECRET=********
GMAIL_USER=you@example.com
GMAIL_APP_PASSWORD=********
APP_DOMAIN=localhost:3000

# Frontend (optional)
PORT=5173
BASE_PATH=/
```

**4. Start the backend**

```
pnpm --filter @workspace/api-server dev
```

API defaults to `http://localhost:5000` (override with `API_PORT`).

**5. Start the frontend**

```
pnpm --filter @workspace/vaidyalink dev
```

Vite defaults to `http://localhost:5173`, and proxies `/api` to the backend.

* * *

## Architecture

The repo is a **PNPM Workspace** monorepo:

```
Reserve-ERP-An-Appoinment-Booking-System/
├── artifacts/vaidyalink/         React SPA (Vite)
├── artifacts/api-server/         Express API (TypeScript)
├── lib/db/                       MySQL pool + Drizzle ORM bindings
├── lib/api-client-react/         Generated React Query API client
├── lib/api-zod/                  Shared Zod schemas
├── schema.mysql.sql              MySQL schema
```

Key frontend pages:

* **BusinessesPage** — provider discovery with filters
* **BusinessDetailPage** — slot selection + booking
* **Dashboard** — provider management (resources, schedule, analytics)
* **AppointmentsPage** — patient booking history

* * *

## Data Model

The MySQL schema is defined in `schema.mysql.sql`. Core tables include:

* `users` — authentication, roles, and profile data
* `providers` — business profile + approval state
* `services` — bookable services with duration and price
* `resources` — rooms/chairs/turfs associated with providers
* `schedules` and `slots` — availability definition and slot inventory
* `appointments` — booking lifecycle
* `invoices` — payment tracking and status

* * *

## API Architecture

All API routes are mounted under `/api`:

* `GET /api/healthz` — health check
* `/api/auth` — registration, login, OTP verification
* `/api/providers` — search + provider profiles
* `/api/bookings` — create, list, update bookings
* `/api/dashboard` — provider analytics and tools
* `/api/services` — provider service CRUD
* `/api/resources` — provider resource CRUD
* `/api/schedule` — working hours + slots
* `/api/onboarding` — provider onboarding flow
* `/api/invoices` — invoice management
* `/api/admin` — approval and moderation
* `/api/payments` — Razorpay checkout + signature verification

Authentication uses JWTs stored in HTTP-only cookies, with role-based access for patient/provider/admin workflows.

* * *

## Component Reference

**Frontend (`artifacts/vaidyalink`)**

* `src/pages/BusinessesPage.tsx` — provider listing + filters
* `src/pages/BusinessDetailPage.tsx` — resource selection + booking flow
* `src/pages/dashboard/` — provider dashboard (resources, schedule, analytics)
* `src/pages/AppointmentsPage.tsx` — patient appointment management

**Shared libraries**

* `lib/api-client-react` — typed client for API calls
* `lib/api-zod` — request/response validation schemas
* `lib/db` — MySQL pool and Drizzle schema bindings

* * *

## Backend Engine

The API server (`artifacts/api-server`) is built with Express + TypeScript and uses:

* **mysql2** pooled connections and SQL queries
* **Transactional booking** logic to lock slots and prevent double-booking
* **Pino** HTTP logging
* **Razorpay** payments + **Nodemailer** invoice delivery

* * *

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets |
| `API_PORT` | API server port (default 5000) |
| `LOG_LEVEL` | API log verbosity |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay credentials |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | SMTP sender |
| `APP_DOMAIN` | Domain used in email links |
| `PORT` / `BASE_PATH` | Frontend dev port + base path |

* * *

## Known Limitations

* The repository does not include a `.env` template — environment variables must be created manually.
* MySQL schema is applied via `schema.mysql.sql` (no migration tooling wired to runtime).
* `test-checkout` is restricted to Razorpay **test** credentials.

* * *

## Contributing

1. Fork the repo and create a feature branch.
2. Keep changes scoped and well-documented.
3. Open a pull request with a clear summary and screenshots if UI changes.

* * *

## License

Licensed under the [MIT License](LICENSE).

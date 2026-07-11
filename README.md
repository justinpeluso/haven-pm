# Haven PM

A modern, full-stack property management platform for leasing, maintenance, tenant communication, and internal staff collaboration.

## Tech Stack

- **Framework:** Next.js 15 (App Router, Server Actions, Turbopack)
- **Language:** TypeScript
- **UI:** TailwindCSS, shadcn/ui, Radix primitives
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Auth.js (NextAuth v5) with role-based access control
- **Data Fetching:** TanStack Query
- **Validation:** Zod
- **Search:** Fuse.js (fuzzy matching)

## Features

### Role-Based Dashboards
Custom dashboards for Administrator, Property Manager, Leasing Agent, Maintenance Staff, Office Staff, Tenant, and Prospect roles.

### Property Management
Relational property database with units, owners, photos, documents, amenities, and full activity timelines.

### Maintenance Module
Complete work order lifecycle with status tracking, priority levels, staff assignment, vendor/cost tracking, photo uploads, and immutable timeline logs.

### Tenant Portal
- Submit and track maintenance requests
- View lease documents and notices
- Internal messaging with staff
- **Pay Rent** button (links to external payment portal — no payment processing built in)

### Prospect CRM
Lead pipeline with status tracking, showing scheduling, property interest linking, and permanent activity history.

### Shared Calendar
Staff-only calendar for showings, maintenance appointments, inspections, move-ins/outs, and recurring events.

### Global Search
Fuzzy search across properties, tenants, prospects, maintenance, documents, users, and calendar events. Command palette via `⌘K`.

### Notes & Activity
Soft-deletable notes on every record type. Comprehensive audit trails with old/new value tracking.

### Reports
Vacancy, occupancy, maintenance costs, leasing pipeline, lease expirations, and properties by city.

## Getting Started

### Quick Launch (easiest)

**Double-click** `Launch Haven PM.command` in Finder, or run:

```bash
cd ~/Projects/haven-pm
./start.sh
```

This script will:
1. Ensure Node.js is available
2. Create `.env` with a generated `AUTH_SECRET` (first run only)
3. Install npm dependencies (first run only)
4. Start PostgreSQL via Docker
5. Sync the database and seed demo data
6. Open the app at [http://localhost:3000](http://localhost:3000)

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) must be installed and running for PostgreSQL.

### Manual Setup

### Prerequisites

- Node.js 20+ (installed via `brew install node@20`)
- Docker (for PostgreSQL) or a PostgreSQL instance

```bash
# Clone and install
cd ~/Projects/haven-pm
npm install

# Configure environment
cp .env.example .env
# Edit .env — set AUTH_SECRET (generate with: openssl rand -base64 32)

# Start PostgreSQL
docker compose up -d

# Push schema and seed
npm run db:push
npm run db:seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Accounts

All accounts use password: `password123`

| Email | Role |
|-------|------|
| admin@havenpm.com | Administrator |
| manager@havenpm.com | Property Manager |
| agent@havenpm.com | Leasing Agent |
| maintenance@havenpm.com | Maintenance Staff |
| office@havenpm.com | Office Staff |
| tenant@havenpm.com | Tenant |

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/     # Authenticated app pages
│   ├── api/             # API routes (search, notifications, auth)
│   └── login/           # Auth page
├── components/
│   ├── dashboard/       # Role-specific dashboard widgets
│   ├── layout/          # Sidebar, header, command palette
│   ├── maintenance/     # Maintenance forms
│   ├── shared/          # Reusable components (timeline, etc.)
│   └── ui/              # shadcn/ui primitives
├── lib/
│   ├── actions/         # Server Actions
│   ├── auth/            # Auth.js config & session helpers
│   ├── queries/         # Data fetching functions
│   └── validations/     # Zod schemas
prisma/
├── schema.prisma        # Database schema
└── seed.ts              # Demo data
```

## Architecture Notes

### Security
- Server-side permission checks on every action
- JWT sessions via Auth.js
- Middleware route protection
- Input validation with Zod
- Soft deletes (notes, records)
- Audit logging

### Extensibility
The modular schema and action-based architecture support future modules:
- Accounting & rent payments (Stripe integration ready)
- Owner portal, vendor portal
- Electronic signatures, SMS/email campaigns
- Mobile app (API-ready data layer)
- GIS property mapping

### Payment Integration
The tenant "Pay Rent" button links to `PAYMENT_PORTAL_URL` in settings. Replace with Stripe, ACH, or any payment provider without changing the tenant UI.

## New Features

### Calendar
- Month, week, and agenda views
- Drag-and-drop to reschedule events
- Color-coded event types with legend
- Create events at `/calendar/new`

### Forms
- Add properties at `/properties/new`
- Add prospects at `/prospects/new`

### Real-time Notifications
- Server-Sent Events (SSE) stream
- Toast popups for new notifications
- Live unread badge in header

### Document Preview
- In-browser PDF preview (iframe)
- Image preview support
- Download and open-in-new-tab actions

### Report Export
- Export to CSV, Excel (.xlsx), or PDF
- Portfolio summary, maintenance, and leasing pipeline reports

### Stripe Payments (optional)
- Configure in Settings → Payment Provider
- Stripe Checkout for tenant rent payments
- Falls back to external portal URL when Stripe is not configured

## Deploy for free (public URL)

**Live demo:** https://haven-pm.vercel.app  
**Login:** `admin@havenpm.com` / `password123`  
**Local:** http://localhost:3000 (separate Postgres — do not point `.env` at Neon)

**Downtown Properties:** `/downtown` — 250+ CBDs within ~40 miles of Allegheny County (PA + OH), section search, vibrancy/vacancy estimates, business mix, US peer comparisons. Uses OpenStreetMap when available; baked baselines work offline of Overpass (local + Vercel).

Best free combo for this stack: **Neon** (Postgres) + **GitHub** + **Vercel**.

### Environment variables on Vercel

| Name | Value |
|------|--------|
| `DATABASE_URL` | Neon connection string (via Vercel Neon integration) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://haven-pm.vercel.app` |
| `MESSAGING_PORTAL_URL` | `https://my.quo.com/` |
| `MESSAGING_PROVIDER_NAME` | `OpenPhone` |
| `MESSAGING_PHONE_NUMBER` | `(412) 797-5007` |

Build command is set in `vercel.json` (`npm run vercel-build`).

Helpers (run in Terminal; keep local `.env` on localhost Postgres):

```bash
./scripts/deploy-online.sh   # link, Neon, deploy, seed
./scripts/seed-prod.sh       # re-seed Neon only
./scripts/finish-online.sh   # env checks + seed + smoke
```

### Limits to know

- Vercel/Neon free tiers are fine for demos; they sleep/idle and have usage caps  
- File uploads use the local disk today — they **won’t persist** on Vercel (documents may break until you add S3/Blob storage)
- Edge middleware must stay slim (no Prisma/bcrypt in `src/middleware.ts`)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

## License

Private — All rights reserved.

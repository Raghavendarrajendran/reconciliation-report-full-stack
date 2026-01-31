# Prepayment Reconciliation Platform

Full-stack **Prepayment Reconciliation** platform: reconcile Prepayment Schedule vs Trial Balance, track mismatches across entities, enforce Maker–Checker on adjustments, and support audit-ready reporting. This is a **reconciliation and governance platform**, not an accounting system.

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, React Query, React Router, IndexedDB (idb)
- **Backend**: Node.js (Express), JWT auth, RBAC
- **State**: React Query + React Context (Auth, Theme)
- **UI**: Dark / Light / System theme, mobile-first layout

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env   # optional: set JWT_SECRET, PORT, CORS_ORIGIN
npm install
npm run dev
```

API runs at `http://localhost:4000`. On first run, seed creates:

- **User**: `admin@example.com` / `Admin123!` (role: APP_ADMINISTRATOR)
- Sample entities (ENT01, ENT02) and fiscal periods (2024-Q1, 2024-Q2)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`. Vite proxies `/api` to `http://localhost:4000`.

**Login**: Use `admin@example.com` / `Admin123!`.

### Deploy entire app to Vercel (recommended)

Deploy **frontend and API together** from the repo root (single project):

1. In Vercel: **Import** this repo. **Do not** set a Root Directory (leave at repo root).
2. Vercel will use the root `vercel.json`: builds frontend (`npm run build` → `frontend/dist`), serves `/api/*` via the Express app in `api/`, and SPA fallback for all other routes.
3. **Environment variables** (Project Settings → Environment Variables): set `JWT_SECRET` (required), and optionally `CORS_ORIGIN` (e.g. your Vercel app URL), `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`. See root `.env.example`.
4. Deploy. The app and API run on the same origin; no `VITE_API_URL` needed.

**Alternative – frontend-only deploy:** Set Root Directory to `frontend` and use `frontend/vercel.json`. Then run the backend elsewhere and set `VITE_API_URL` to the API base URL in the frontend project’s env.

## Features

- **Auth & RBAC**: JWT login/refresh, roles (App Administrator, Admin, Entity User, Maker, Checker, Auditor), route guards, entity-scoped access
- **Theme**: Dark / Light / System, persisted in IndexedDB and optional backend settings
- **Master Data**: Entities, GL Accounts, Prepaid/Expense mappings, Fiscal Periods, tolerance (admin)
- **Excel Upload**: Prepayment Schedule and Trial Balance; sheet/column mapping, validation preview, versioning
- **Reconciliation Engine**: Expected Closing = Opening + New Prepayments − Amortization; compare with TB; status: AUTO_CLOSED, OPEN, PENDING_CHECKER, CLOSED, REOPENED
- **Adjustments**: Maker proposes (debit/credit, explanation); Checker approves/rejects (no self-approval, mandatory comments on reject)
- **Dashboards**: Role-aware summary (by status, pending approvals)
- **Reports**: Dynamic report API (dataset, filters); report definitions; export audit
- **Audit**: Immutable log (uploads, reconciliations, adjustments, approvals, report export)
- **IndexedDB**: Preferences (theme), draft uploads, draft adjustments, filter state (offline-friendly drafts)

## Project Structure

- `backend/` – Express API, services, reconciliation engine, in-memory store (replace with DB for production)
- `frontend/` – React app, auth/theme context, layout, pages (Dashboard, Masters, Uploads, Reconciliations, Adjustments, Reports, Audit)
- `docs/` – ARCHITECTURE.md, ROLE-PERMISSION-MATRIX.md, INDEXEDDB-SCHEMA.md, API-SAMPLES.md

## API Overview

- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET/POST/PATCH/DELETE /api/entities`, `/api/gl-accounts`, `/api/periods`, `/api/mappings/prepaid`, `/api/mappings/expense`
- `POST /api/uploads/parse`, `POST /api/uploads/schedule`, `POST /api/uploads/trial-balance`
- `GET /api/reconciliations`, `POST /api/reconciliations/run`, `PATCH /api/reconciliations/:id`
- `GET/POST /api/adjustments`, `POST /api/adjustments/:id/approve`, `POST /api/adjustments/:id/reject`
- `GET /api/dashboards/summary`, `GET/POST/PATCH/DELETE /api/dashboards/configs`
- `GET /api/reports/dynamic`, `GET /api/reports/definitions`, `POST /api/reports/export`
- `GET /api/audit`, `GET/PATCH /api/settings`

See `docs/API-SAMPLES.md` for curl examples.

## Non-Negotiables

- Separation of concerns (routes → services → store)
- API validation (express-validator)
- UI permission guards (no hardcoded roles; derive from API)
- Full traceability (audit log)
- **No accounting posting** – reconciliation and governance only

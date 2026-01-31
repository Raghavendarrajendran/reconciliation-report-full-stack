# Prepayment Reconciliation Platform – Architecture

## Overview

This is a **reconciliation and governance platform**, not an accounting system. It reconciles Prepayment Schedule vs Trial Balance, tracks mismatches, and enforces Maker–Checker on adjustments. No direct posting to GL.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite + Tailwind)                              │
│  - Auth (JWT), Theme (dark/light), RBAC guards                   │
│  - IndexedDB: drafts, theme, filter state                       │
│  - React Query, React Router                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST /api/*
┌───────────────────────────▼─────────────────────────────────────┐
│  Backend (Node.js + Express)                                      │
│  - JWT auth, role-based middleware                               │
│  - Service layer: auth, entities, uploads, reconciliation,     │
│    adjustments, dashboards, reports, audit                       │
│  - In-memory store (replace with DB in production)               │
└─────────────────────────────────────────────────────────────────┘
```

## Folder Structure

### Backend

```
backend/
├── src/
│   ├── index.js              # Express app, routes, seed
│   ├── config/
│   │   └── constants.js       # ROLES, RECONCILIATION_STATUS, ADJUSTMENT_STATUS, AUDIT_ACTIONS
│   ├── middleware/
│   │   ├── auth.js            # authenticate, requireRoles, requireEntityAccess
│   │   └── error-handler.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── entities.js
│   │   ├── gl-accounts.js
│   │   ├── mappings.js
│   │   ├── periods.js
│   │   ├── uploads.js
│   │   ├── reconciliations.js
│   │   ├── adjustments.js
│   │   ├── dashboards.js
│   │   ├── reports.js
│   │   ├── audit.js
│   │   └── settings.js
│   ├── services/
│   │   ├── auth-service.js
│   │   ├── audit-service.js
│   │   ├── entity-service.js
│   │   ├── gl-account-service.js
│   │   ├── mapping-service.js
│   │   ├── period-service.js
│   │   ├── upload-service.js      # Excel parse, save schedule/TB
│   │   ├── reconciliation-service.js
│   │   ├── reconciliation-engine.js  # Core: expected vs TB, status
│   │   └── adjustment-service.js   # Maker–Checker
│   └── store/
│       └── index.js            # In-memory store (replace with DB)
├── package.json
└── .env.example
```

### Frontend

```
frontend/
├── src/
│   ├── main.jsx
│   ├── App.jsx                # Routes, QueryClient, Auth/Theme providers
│   ├── index.css               # Tailwind + theme tokens
│   ├── context/
│   │   ├── AuthContext.jsx      # login, logout, user, hasRole, canAccessEntity
│   │   └── ThemeContext.jsx    # dark/light/system, persist to IndexedDB
│   ├── components/
│   │   ├── ProtectedRoute.jsx  # Route guard by role
│   │   └── Layout.jsx          # Header, sidebar (role-based nav), theme toggle, Outlet
│   ├── lib/
│   │   ├── api.js              # api(), authApi, entitiesApi, ... settingsApi
│   │   └── db.js               # IndexedDB: preferences, draft_uploads, draft_adjustments, filter_state
│   └── pages/
│       ├── Login.jsx
│       ├── Dashboard.jsx       # Role-aware summary (by status, pending approvals)
│       ├── Users.jsx
│       ├── Entities.jsx
│       ├── Masters.jsx         # Links to entities, GL, periods
│       ├── GlAccounts.jsx
│       ├── Periods.jsx
│       ├── Uploads.jsx          # Parse Excel, save schedule/TB
│       ├── Reconciliations.jsx # List, filters, link to propose adjustment
│       ├── Adjustments.jsx     # List, approve/reject (Checker)
│       ├── Reports.jsx         # Dynamic report (dataset, filters)
│       └── Audit.jsx           # Audit log (Admin/Auditor)
├── package.json
└── vite.config.js             # Tailwind, proxy /api -> backend
```

## Reconciliation Engine (Core Logic)

- **Expected Closing** = Opening Balance + New Prepayments − Amortization (from Schedule).
- **Compare** with Trial Balance Closing Balance.
- **Status rules:**
  - Exact match or within tolerance → `AUTO_CLOSED`
  - Difference → `OPEN`
  - Adjustment proposed → `PENDING_CHECKER`
  - Approved → `CLOSED`
  - Rejected → `REOPENED`

Tolerance is configurable per entity/period (settings/tolerance). No accounting posting; only logical reconciliation entries.

## Data Flow

1. **Upload**: Prepayment Schedule and Trial Balance Excel → parse (column mapping) → save to store (and optionally IndexedDB draft).
2. **Run reconciliation**: POST `/api/reconciliations/run` with `scheduleUploadId`, `tbUploadId`, `entityId`, `periodId` → engine computes expected vs TB, sets status.
3. **Adjustments**: Maker proposes (debit/credit, explanation) → Checker approves/rejects. No self-approval; mandatory comments on reject.
4. **Dashboards/Reports**: Role-aware summaries and dynamic report API with filters (entity, period, status).

## Security

- JWT in `Authorization: Bearer <token>`; refresh token for session extension.
- All authenticated routes use `authenticate` middleware; role checks via `requireRoles` or entity filters.
- Audit log records login, uploads, reconciliation views, adjustment propose/approve/reject, report export, master CRUD.

## Non-Negotiables

- Separation of concerns: routes → services → store.
- API validation (express-validator) on inputs.
- UI permission guards (ProtectedRoute, role-based nav).
- No hardcoded roles in UI (derive from API/user).
- Full traceability via audit log.
- No accounting posting; platform is reconciliation and governance only.

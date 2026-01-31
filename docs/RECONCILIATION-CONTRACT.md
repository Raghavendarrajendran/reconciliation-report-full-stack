# Prepayment Reconciliation – API Contract & Data Flow

This document defines the **canonical reconciliation formula**, **normalized data models**, **evidence shape**, and **API contracts** for the Prepayment Reconciliation Platform. No other reconciliation logic is allowed.

---

## 1. Canonical Reconciliation Formula

For every **Entity × Fiscal Period × Prepaid Account**:

```
Expected Closing Balance
  = Opening Balance
  + Additions
  − Amortization
  ± Approved Adjustments

Actual Closing Balance = Trial Balance Closing Balance

Variance = Actual − Expected (after adjustments)

IF abs(Variance) ≤ Tolerance  →  Status = CLOSED
ELSE                          →  Status = OPEN
```

- **Closure is determined only by this formula.** The API does not allow manually setting status to `CLOSED`; only the reconciliation engine sets it when the math is satisfied.
- **Closed reconciliations are locked:** no new adjustments can be proposed.
- **Approved adjustments** update Expected Closing; variance and status are recomputed after approval.

---

## 2. Normalized Line Models (Backend Store)

### schedule_lines (Prepayment Schedule – consumption/amortization)

| Field          | Type      | Description                     |
| -------------- | --------- | ------------------------------- |
| id             | string    | UUID                            |
| uploadId       | string    | Upload record id                |
| entity         | string    | Entity code/id                  |
| fiscalYear     | string    | e.g. "2024"                     |
| fiscalPeriod   | string    | Period code                     |
| applyDate      | string    | Posting/apply date              |
| prepaidAccount | (account) | Prepaid account being amortized |
| expenseAccount | string    | Expense account (optional)      |
| debitAmount    | number    | Debit amount                    |
| creditAmount   | number    | Credit amount (amortization)    |
| amountSigned   | number    | debitAmount − creditAmount      |

Amortization for a prepaid account in a period = **SUM(creditAmount)** over schedule lines matching entity, period, and account.

### pprec_lines (PPREC – movement)

| Field           | Type   | Description                               |
| --------------- | ------ | ----------------------------------------- |
| id              | string | UUID                                      |
| uploadId        | string | Upload record id                          |
| entity          | string | Entity                                    |
| fiscalYear      | string | Fiscal year                               |
| fiscalPeriod    | string | Period                                    |
| prepaidAccount  | string | Prepaid account                           |
| openingBalance  | number | Opening balance                           |
| additions       | number | Additions                                 |
| amortization    | number | Amortization (from PPREC)                 |
| expectedClosing | number | openingBalance + additions − amortization |

**Data priority:** Prefer PPREC values (opening, additions, amortization). If amortization is missing in PPREC, derive from Schedule (SUM creditAmount).

### tb_lines (Trial Balance – actual closing)

| Field                | Type   | Description              |
| -------------------- | ------ | ------------------------ |
| id                   | string | UUID                     |
| uploadId             | string | Upload record id         |
| entity               | string | Entity                   |
| fiscalYear           | string | Fiscal year              |
| fiscalPeriod         | string | Period                   |
| account              | string | GL account               |
| closingBalanceSigned | number | Closing balance (signed) |

**Actual Closing** = TB row for same entity, period, and account (prepaid account).

---

## 3. Reconciliation Record (Engine Output)

| Field                                    | Type                                                                   | Description                             |
| ---------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| id                                       | string                                                                 | UUID                                    |
| entityId                                 | string                                                                 | Entity                                  |
| fiscalYear                               | string                                                                 | Optional                                |
| periodId                                 | string                                                                 | Period                                  |
| prepaidAccount                           | string                                                                 | Prepaid account                         |
| openingBalance                           | number                                                                 | From PPREC or 0                         |
| additions                                | number                                                                 | From PPREC or 0                         |
| amortization                             | number                                                                 | From PPREC or Schedule                  |
| expectedClosing                          | number                                                                 | Opening + Additions − Amortization      |
| expectedClosingAdjusted                  | number                                                                 | + approved adjustment impact            |
| actualClosing                            | number                                                                 | From TB                                 |
| variance                                 | number                                                                 | actualClosing − expectedClosingAdjusted |
| status                                   | "OPEN" \| "CLOSED" \| "PENDING_CHECKER" \| "REOPENED" \| "AUTO_CLOSED" |
| toleranceUsed                            | number                                                                 | Tolerance applied                       |
| version, createdAt, updatedAt, deletedAt |                                                                        |                                         |

---

## 4. Evidence Object (per Reconciliation)

Returned by `GET /api/reconciliations/:id?evidence=true`. Used for accounting story and audit.

| Field                     | Type   | Description                                                                                         |
| ------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| reconciliationId          | string | Reconciliation id                                                                                   |
| sourceTbRow               | object | TB row used: account, closingBalanceSigned, lineId, raw                                             |
| pprecValues               | object | openingBalance, additions, amortization, source, lineId                                             |
| pprecLines                | array  | Raw PPREC line(s) used (for Evidence tab)                                                           |
| scheduleLinesContributing | array  | Schedule lines contributing to amortization                                                         |
| approvedAdjustments       | array  | Approved adjustment entries (id, debitAccount, creditAccount, amount, impactOnPrepaid)              |
| warnings                  | array  | { code, message } e.g. MISSING_TB_ROW, MISSING_SCHEDULE_AMORTIZATION, DUPLICATE_SCHEDULE_LINES      |
| expectedClosingFormula    | object | openingBalance, additions, amortization, expectedClosing, adjustmentImpact, expectedClosingAdjusted |
| actualClosing             | number | From TB                                                                                             |
| variance                  | number | Actual − Expected                                                                                   |
| status                    | string | Reconciliation status                                                                               |
| toleranceUsed             | number | Tolerance used                                                                                      |

---

## 5. Dashboard Summary API

`GET /api/dashboards/summary?entityId=&periodId=`

**Response:**

- **byStatus** – `{ OPEN: n, CLOSED: n, ... }`
- **total** – Total reconciliation count
- **pendingApprovals** – Count of adjustments in PENDING_APPROVAL
- **varianceTotals** – `{ openSum, closedSum }` (sum of variance for open vs closed items)
- **byEntity** – `{ entityId: count, ... }`
- **byPeriod** – `{ periodId: count, ... }`
- **entityId, periodId** – Applied filters

Widgets are role-aware: Admin sees all entities; Entity User sees assigned entities; Maker sees open items; Checker sees pending approvals; Auditor sees closed & history.

---

## 6. Reconciliations List API

`GET /api/reconciliations?entityId=&periodId=&status=&varianceMin=&varianceMax=&fiscalYear=&prepaidAccount=`

**Query params:** entityId, periodId, fiscalYear, status, prepaidAccount, **varianceMin**, **varianceMax**.

**Response:** `{ reconciliations: [ ... ] }`

---

## 7. Sample Data Flow

1. **Upload**
   - `POST /api/uploads/parse` – parse Excel, get sheets and sample.
   - `POST /api/uploads/schedule-file` or `trial-balance-file` or `pprec-file` – upload file + sheetName + entityId + periodId (+ fiscalYear for PPREC). Backend normalizes into `schedule_lines`, `tb_lines`, or `pprec_lines`.

2. **Run reconciliation**
   - `POST /api/reconciliations/run` – body: `{ entityId, periodId, fiscalYear? }`. Engine discovers all prepaid accounts from PPREC + Schedule + TB for that entity/period, computes Expected (PPREC preferred, else Schedule for amortization), Actual from TB, variance, status; persists reconciliation records.

3. **Dashboard**
   - `GET /api/dashboards/summary` – consumed by Dashboard UI (totals, open/closed, variance totals, by entity, by period).

4. **Detail & evidence**
   - `GET /api/reconciliations/:id?evidence=true` – returns reconciliation + evidence (TB row, PPREC values/lines, schedule lines, adjustments, warnings, formula). UI shows accounting story and Evidence tabs; Export evidence as JSON.

5. **Adjustments**
   - Maker: `POST /api/adjustments` – propose (reconciliationId, debitAccount, creditAccount, amount, explanation). Rejected if reconciliation is CLOSED (locked).
   - Checker: `POST /api/adjustments/:id/approve` or `reject` – approve updates Expected Closing and recomputes variance/status; reject reopens reconciliation.

6. **Closure**
   - Closure only when `abs(variance) ≤ tolerance` (set by engine). `PATCH /api/reconciliations/:id` cannot set status to CLOSED/AUTO_CLOSED; only REOPENED or other non-closed statuses allowed.

---

## 8. Absolute Rules (Enforced)

- Do **not** auto-post accounting entries.
- Do **not** modify TB values.
- Do **not** allow closure without satisfying the formula (engine-only CLOSED).
- Dashboards **consume** reconciliation status and variance totals from the API; they do not recompute logic.
- Closed reconciliations are **locked** (no new adjustments).

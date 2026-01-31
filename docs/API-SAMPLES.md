# API Samples

Base URL: `http://localhost:4000/api` (or relative `/api` when using frontend proxy).

## Auth

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'
# Response: { "accessToken", "refreshToken", "expiresIn", "user": { "id", "email", "name", "role", "entityIds" } }

# Me
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"

# Logout
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Authorization: Bearer <accessToken>"
```

## Entities

```bash
curl -X GET "http://localhost:4000/api/entities" -H "Authorization: Bearer <token>"
curl -X POST http://localhost:4000/api/entities \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"code":"ENT03","name":"Entity Three","currency":"USD"}'
```

## Uploads

Upload **Prepayment Schedule**, **PPREC**, and **Trial Balance**. Normalized into `schedule_lines`, `pprec_lines`, `tb_lines`.

```bash
# Parse Excel (multipart)
curl -X POST http://localhost:4000/api/uploads/parse \
  -H "Authorization: Bearer <token>" \
  -F "file=@prepayment_schedule.xlsx"

# Save schedule (file upload)
curl -X POST http://localhost:4000/api/uploads/schedule-file \
  -H "Authorization: Bearer <token>" \
  -F "file=@schedule.xlsx" -F "sheetName=Sheet1" -F "entityId=<id>" -F "periodId=<id>"

# Save PPREC (file upload)
curl -X POST http://localhost:4000/api/uploads/pprec-file \
  -H "Authorization: Bearer <token>" \
  -F "file=@pprec.xlsx" -F "sheetName=PPREC" -F "entityId=<id>" -F "periodId=<id>" -F "fiscalYear=2024"

# Save trial balance (file upload)
curl -X POST http://localhost:4000/api/uploads/trial-balance-file \
  -H "Authorization: Bearer <token>" \
  -F "file=@tb.xlsx" -F "sheetName=TB" -F "entityId=<id>" -F "periodId=<id>"

# List PPREC uploads
curl -X GET "http://localhost:4000/api/uploads/pprec?entityId=&periodId=" -H "Authorization: Bearer <token>"

# Save schedule (JSON body)
curl -X POST http://localhost:4000/api/uploads/schedule \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"entityId":"<id>","periodId":"<id>","rows":[{"entity":"ENT01","fiscal_year":"2024","fiscal_period":"Q1","account":"PREP-01","credit_amount":100}]}'

# Save trial balance (JSON body)
curl -X POST http://localhost:4000/api/uploads/trial-balance \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"entityId":"<id>","periodId":"<id>","rows":[{"entity":"ENT01","fiscal_year":"2024","fiscal_period":"Q1","account":"PREP-01","closing_balance_signed":1100}]}'
```

## Reconciliations

**Canonical formula:** Expected = Opening + Additions − Amortization ± Approved Adjustments; Actual = TB closing; Variance = Actual − Expected; Status = CLOSED if |Variance| ≤ Tolerance, else OPEN. Closure is formula-only; closed reconciliations are locked.

```bash
# List (filters: entityId, periodId, status, varianceMin, varianceMax, fiscalYear, prepaidAccount)
curl -X GET "http://localhost:4000/api/reconciliations?entityId=<id>&periodId=<id>&status=OPEN&varianceMin=-100&varianceMax=100" -H "Authorization: Bearer <token>"

# Get one with evidence (accounting story + exportable evidence)
curl -X GET "http://localhost:4000/api/reconciliations/<id>?evidence=true" -H "Authorization: Bearer <token>"

# Run engine (uses normalized schedule_lines, tb_lines, pprec_lines in store)
curl -X POST http://localhost:4000/api/reconciliations/run \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"entityId":"<id>","periodId":"<id>","fiscalYear":"2024"}'
# Response: { "reconciliations": [ { "id", "entityId", "periodId", "prepaidAccount", "openingBalance", "additions", "amortization", "expectedClosing", "expectedClosingAdjusted", "actualClosing", "variance", "status", "toleranceUsed", ... } ] }

# PATCH status: only REOPENED or other non-CLOSED allowed (closure is formula-only)
curl -X PATCH http://localhost:4000/api/reconciliations/<id> \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"status":"REOPENED","reason":"Reopening for review"}'
```

## Adjustments (Maker–Checker)

```bash
# Propose (Maker)
curl -X POST http://localhost:4000/api/adjustments \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"reconciliationId":"<id>","debitAmount":50,"creditAmount":50,"explanation":"Reclass per policy"}'

# Approve (Checker)
curl -X POST http://localhost:4000/api/adjustments/<id>/approve \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"comment":"Approved"}'

# Reject (Checker)
curl -X POST http://localhost:4000/api/adjustments/<id>/reject \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"comment":"Incorrect account; please re-submit."}'
```

## Dashboards & Reports

```bash
# Summary: byStatus, total, pendingApprovals, varianceTotals (openSum, closedSum), byEntity, byPeriod
curl -X GET "http://localhost:4000/api/dashboards/summary?entityId=&periodId=" -H "Authorization: Bearer <token>"
curl -X GET "http://localhost:4000/api/reports/dynamic?dataset=reconciliations&entityId=&periodId=&status=" -H "Authorization: Bearer <token>"
curl -X GET "http://localhost:4000/api/audit?limit=50" -H "Authorization: Bearer <token>"
```

## Settings

```bash
curl -X GET http://localhost:4000/api/settings -H "Authorization: Bearer <token>"
curl -X PATCH http://localhost:4000/api/settings -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"theme":"dark","filters":{"entityId":"x"}}'
```

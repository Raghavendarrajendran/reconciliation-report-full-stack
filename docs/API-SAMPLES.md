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

```bash
# Parse Excel (multipart)
curl -X POST http://localhost:4000/api/uploads/parse \
  -H "Authorization: Bearer <token>" \
  -F "file=@prepayment_schedule.xlsx"

# Save schedule
curl -X POST http://localhost:4000/api/uploads/schedule \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"entityId":"<id>","periodId":"<id>","rows":[{"opening_balance":1000,"new_prepayments":200,"amortization":100,"prepaid_account_code":"PREP-01"}]}'

# Save trial balance
curl -X POST http://localhost:4000/api/uploads/trial-balance \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"entityId":"<id>","periodId":"<id>","rows":[{"entity_id":"<id>","period_id":"<id>","account_code":"PREP-01","closing_balance":1100}]}'
```

## Reconciliations

```bash
# List
curl -X GET "http://localhost:4000/api/reconciliations?entityId=<id>&periodId=<id>&status=OPEN" -H "Authorization: Bearer <token>"

# Run engine
curl -X POST http://localhost:4000/api/reconciliations/run \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"scheduleUploadId":"<id>","tbUploadId":"<id>","entityId":"<id>","periodId":"<id>"}'
# Response: { "reconciliations": [ { "id", "entityId", "periodId", "prepaidAccountId", "expectedClosing", "tbClosing", "variance", "status", ... } ] }
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
curl -X GET "http://localhost:4000/api/dashboards/summary?entityId=&periodId=" -H "Authorization: Bearer <token>"
curl -X GET "http://localhost:4000/api/reports/dynamic?dataset=reconciliations&entityId=&periodId=&status=" -H "Authorization: Bearer <token>"
curl -X GET "http://localhost:4000/api/audit?limit=50" -H "Authorization: Bearer <token>"
```

## Settings

```bash
curl -X GET http://localhost:4000/api/settings -H "Authorization: Bearer <token>"
curl -X PATCH http://localhost:4000/api/settings -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"theme":"dark","filters":{"entityId":"x"}}'
```

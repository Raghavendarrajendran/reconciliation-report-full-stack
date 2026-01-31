# Role–Permission Matrix

Roles are defined in backend `config/constants.js`. Permissions are enforced in routes (requireRoles, entity filters) and in the UI (ProtectedRoute, nav visibility).

| Role              | Users | Entities        | Masters (GL, Periods, Mappings) | Uploads        | Reconciliations | Adjustments (Propose) | Adjustments (Approve/Reject) | Dashboards | Reports | Audit |
| ----------------- | ----- | --------------- | ------------------------------- | -------------- | --------------- | --------------------- | ---------------------------- | ---------- | ------- | ----- |
| APP_ADMINISTRATOR | CRUD  | CRUD            | CRUD                            | Yes            | All             | Yes                   | Yes                          | All        | Yes     | Yes   |
| ADMIN             | CRUD  | CRUD            | CRUD                            | Yes            | All             | Yes                   | Yes                          | All        | Yes     | No\*  |
| ENTITY_USER       | No    | View (assigned) | View (assigned)                 | Yes (assigned) | Assigned        | No\*\*                | No                           | Assigned   | Yes     | No    |
| MAKER             | No    | View (assigned) | View (assigned)                 | Yes (assigned) | Assigned        | Yes                   | No                           | Assigned   | Yes     | No    |
| CHECKER           | No    | View (assigned) | View (assigned)                 | No             | Assigned        | No                    | Yes                          | Assigned   | Yes     | No    |
| AUDITOR           | No    | View (assigned) | View (assigned)                 | No             | View (assigned) | No                    | No                           | View       | Yes     | Yes   |

\*Audit log access is APP_ADMINISTRATOR and AUDITOR only in this implementation; extend to ADMIN if required.

\*\*ENTITY_USER can view; whether they can propose adjustments is configurable (currently only MAKER/ADMIN/APP_ADMIN can propose in the API).

## Route Guards (Frontend)

- `/users` → APP_ADMINISTRATOR, ADMIN only.
- `/audit` → APP_ADMINISTRATOR, ADMIN, AUDITOR only.
- All other app routes require authentication; entity filtering is applied in API based on `user.entityIds` for non-admin roles.

## API Summary

- **Auth**: POST `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, GET `/api/auth/me`.
- **Users**: GET/POST/PATCH/DELETE `/api/users` (Admin only).
- **Entities, GL Accounts, Periods, Mappings**: CRUD with entity-scoped access.
- **Uploads**: POST `/api/uploads/parse` (file), POST `/api/uploads/schedule`, POST `/api/uploads/trial-balance`, GET list.
- **Reconciliations**: GET list (filters), GET `/:id`, POST `/run`, PATCH `/:id` (status).
- **Adjustments**: GET list, GET `/:id`, POST (propose), POST `/:id/approve`, POST `/:id/reject`.
- **Dashboards**: GET `/summary`, GET/POST/PATCH/DELETE `/configs`.
- **Reports**: GET `/dynamic`, GET/POST `/definitions`, POST `/export`.
- **Audit**: GET `/audit` (query params: userId, action, resource, from, to, limit).
- **Settings**: GET/PATCH `/api/settings` (theme, filters); GET `/api/settings/tolerance`.

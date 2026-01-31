# IndexedDB Schema (Frontend)

Database name: `reconciliation-platform`. Version: 1.

## Object Stores

| Store             | KeyPath            | Indexes                              | Purpose                                                                           |
| ----------------- | ------------------ | ------------------------------------ | --------------------------------------------------------------------------------- |
| preferences       | key                | —                                    | User preferences: theme (dark/light/system), etc.                                 |
| draft_uploads     | id (autoIncrement) | byEntityPeriod: [entityId, periodId] | Cached Excel uploads / draft schedule or TB rows for offline or resume.           |
| draft_adjustments | id (autoIncrement) | —                                    | Unsubmitted adjustment entries (maker drafts).                                    |
| dashboard_configs | id                 | —                                    | Saved dashboard widget/layout configs per user (synced with backend when online). |
| filter_state      | key                | —                                    | Persisted global filters (entity, period, status, etc.) per key (e.g. 'global').  |

## Usage

- **Theme**: On load, read `preferences['theme']`; on theme change, write and optionally sync to backend `/api/settings`.
- **Draft uploads**: After parsing Excel, optionally save to `draft_uploads` with `entityId`, `periodId`, `rows`; on submit, send to API and clear draft.
- **Draft adjustments**: When maker composes an adjustment without submitting, save to `draft_adjustments`; on submit, POST to `/api/adjustments` and remove draft.
- **Filter state**: Read/write `filter_state['global']` so filters persist across sessions and sync with backend `/api/settings` (filters) when desired.

All stores use soft structure: store objects with `key` or `id`, and optional `updatedAt` for cache hygiene.

/**
 * In-memory store – replace with DB (PostgreSQL/Mongo) in production.
 * Structure is audit-ready: UUIDs, soft deletes, timestamps.
 */

const store = {
  users: [],
  entities: [],
  glAccounts: [],
  prepaidMappings: [],
  expenseMappings: [],
  fiscalPeriods: [],
  currencies: [],
  toleranceSettings: [],
  prepaymentSchedules: [],
  trialBalances: [],
  pprecUploads: [],
  schedule_lines: [],
  tb_lines: [],
  pprec_lines: [],
  reconciliations: [],
  adjustmentEntries: [],
  approvals: [],
  dashboardConfigs: [],
  reportDefinitions: [],
  auditLogs: [],
};

export function getStore() {
  return store;
}

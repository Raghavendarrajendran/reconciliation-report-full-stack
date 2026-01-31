import { getStore } from "../store/index.js";
import { ROLES } from "../config/constants.js";
import * as reconciliationEngine from "./reconciliation-engine.js";
import * as evidenceService from "./evidence-service.js";

function canAccessEntity(user, entityId) {
  if (!entityId) return true;
  if (user.role === ROLES.APP_ADMINISTRATOR || user.role === ROLES.ADMIN)
    return true;
  return (user.entityIds ?? []).includes(entityId);
}

export function listReconciliations(filters = {}, user) {
  const store = getStore();
  let list = store.reconciliations.filter((r) => !r.deletedAt);
  if (filters.entityId)
    list = list.filter((r) => r.entityId === filters.entityId);
  if (filters.periodId)
    list = list.filter((r) => r.periodId === filters.periodId);
  if (filters.fiscalYear != null)
    list = list.filter(
      (r) => String(r.fiscalYear ?? "") === String(filters.fiscalYear),
    );
  if (filters.status) list = list.filter((r) => r.status === filters.status);
  if (filters.prepaidAccountId)
    list = list.filter(
      (r) =>
        (r.prepaidAccountId ?? r.prepaidAccount) === filters.prepaidAccountId,
    );
  if (filters.prepaidAccount)
    list = list.filter(
      (r) =>
        (r.prepaidAccount ?? r.prepaidAccountId) === filters.prepaidAccount,
    );
  if (
    user &&
    user.role !== ROLES.APP_ADMINISTRATOR &&
    user.role !== ROLES.ADMIN &&
    user.entityIds?.length
  ) {
    list = list.filter((r) => user.entityIds.includes(r.entityId));
  }
  return list;
}

export function getReconciliation(id, user) {
  const store = getStore();
  const rec = store.reconciliations.find((r) => r.id === id && !r.deletedAt);
  if (!rec) return null;
  if (!canAccessEntity(user, rec.entityId)) return null;
  return rec;
}

export function getReconciliationWithEvidence(id, user) {
  const rec = getReconciliation(id, user);
  if (!rec) return null;
  const evidence = evidenceService.buildEvidence(id);
  return { ...rec, evidence };
}

/**
 * Run reconciliation for (entityId, fiscalYear, periodId).
 * Uses normalized schedule_lines, tb_lines, pprec_lines in store (populated by uploads).
 */
export function runReconciliations(entityId, fiscalYear, periodId, user) {
  if (!canAccessEntity(user, entityId))
    throw Object.assign(new Error("Access denied"), { status: 403 });
  return reconciliationEngine.runAllReconciliations(
    entityId,
    fiscalYear ?? null,
    periodId,
  );
}

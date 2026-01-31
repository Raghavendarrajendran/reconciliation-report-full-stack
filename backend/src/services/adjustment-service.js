import { v4 as uuidv4 } from "uuid";
import { getStore } from "../store/index.js";
import {
  ROLES,
  ADJUSTMENT_STATUS,
  RECONCILIATION_STATUS,
} from "../config/constants.js";
import { recomputeReconciliation } from "./reconciliation-engine.js";

/**
 * Maker proposes adjustment: debitAccount, creditAccount, amount, reason.
 * impactOnPrepaid: debit prepaid => +amount, credit prepaid => -amount.
 * Checker approves/rejects. On approve, recompute reconciliation (expectedClosingAdjusted, variance, status).
 */

function canAccessEntity(user, entityId) {
  if (!entityId) return true;
  if (user.role === ROLES.APP_ADMINISTRATOR || user.role === ROLES.ADMIN)
    return true;
  return (user.entityIds ?? []).includes(entityId);
}

export function listAdjustments(filters = {}, user) {
  const store = getStore();
  let list = store.adjustmentEntries.filter((a) => !a.deletedAt);
  if (filters.reconciliationId)
    list = list.filter((a) => a.reconciliationId === filters.reconciliationId);
  if (filters.entityId)
    list = list.filter((a) => a.entityId === filters.entityId);
  if (filters.status) list = list.filter((a) => a.status === filters.status);
  if (filters.makerId) list = list.filter((a) => a.makerId === filters.makerId);
  if (
    user &&
    user.role !== ROLES.APP_ADMINISTRATOR &&
    user.role !== ROLES.ADMIN &&
    user.entityIds?.length
  ) {
    list = list.filter((a) => user.entityIds.includes(a.entityId));
  }
  return list;
}

export function getAdjustment(id, user) {
  const store = getStore();
  const adj = store.adjustmentEntries.find((a) => a.id === id && !a.deletedAt);
  if (!adj) return null;
  if (!canAccessEntity(user, adj.entityId)) return null;
  return adj;
}

/**
 * impactOnPrepaid: if adjustment debits prepaid account => +amount; if credits prepaid => -amount.
 */
function computeImpactOnPrepaid(
  debitAccount,
  creditAccount,
  amount,
  prepaidAccount,
) {
  const prepaid = String(prepaidAccount ?? "").trim();
  let impact = 0;
  if (String(debitAccount ?? "").trim() === prepaid)
    impact += Number(amount) || 0;
  if (String(creditAccount ?? "").trim() === prepaid)
    impact -= Number(amount) || 0;
  return impact;
}

export function proposeAdjustment(
  {
    reconciliationId,
    entityId,
    periodId,
    debitAccount,
    creditAccount,
    amount,
    explanation,
    debitAmount,
    creditAmount,
  },
  makerId,
) {
  const store = getStore();
  const rec = store.reconciliations.find(
    (r) => r.id === reconciliationId && !r.deletedAt,
  );
  if (!rec)
    throw Object.assign(new Error("Reconciliation not found"), { status: 404 });
  if (rec.status === RECONCILIATION_STATUS.CLOSED)
    throw Object.assign(
      new Error("Reconciliation is closed and locked; no new adjustments."),
      { status: 400 },
    );
  const amt =
    Number(amount) ?? Number(debitAmount) ?? Number(creditAmount) ?? 0;
  if (amt <= 0)
    throw Object.assign(new Error("Amount must be positive"), { status: 400 });
  if (!explanation?.trim())
    throw Object.assign(new Error("Explanation is mandatory"), { status: 400 });
  const prepaid = rec.prepaidAccount ?? rec.prepaidAccountId;
  const hasAccounts =
    (debitAccount != null && String(debitAccount).trim() !== "") ||
    (creditAccount != null && String(creditAccount).trim() !== "");
  const impactOnPrepaid = hasAccounts
    ? computeImpactOnPrepaid(debitAccount, creditAccount, amt, prepaid)
    : 0;

  const id = uuidv4();
  const now = new Date().toISOString();
  const entry = {
    id,
    reconciliationId,
    entityId: entityId ?? rec.entityId,
    periodId: periodId ?? rec.periodId,
    debitAccount: debitAccount ?? null,
    creditAccount: creditAccount ?? null,
    amount: amt,
    impactOnPrepaid,
    explanation: explanation.trim(),
    status: ADJUSTMENT_STATUS.PENDING_APPROVAL,
    makerId,
    checkerId: null,
    makerComment: explanation.trim(),
    checkerComment: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  store.adjustmentEntries.push(entry);

  const row = store.reconciliations.find((r) => r.id === reconciliationId);
  row.status = RECONCILIATION_STATUS.PENDING_CHECKER;
  row.updatedAt = now;

  const approval = {
    id: uuidv4(),
    adjustmentId: id,
    action: "PROPOSED",
    userId: makerId,
    comment: explanation.trim(),
    timestamp: now,
  };
  store.approvals.push(approval);
  return entry;
}

export function approveAdjustment(adjustmentId, checkerId, comment) {
  const store = getStore();
  const adj = store.adjustmentEntries.find(
    (a) => a.id === adjustmentId && !a.deletedAt,
  );
  if (!adj)
    throw Object.assign(new Error("Adjustment not found"), { status: 404 });
  if (adj.makerId === checkerId)
    throw Object.assign(new Error("No self-approval"), { status: 403 });
  if (adj.status !== ADJUSTMENT_STATUS.PENDING_APPROVAL)
    throw Object.assign(new Error("Not pending approval"), { status: 400 });

  adj.status = ADJUSTMENT_STATUS.APPROVED;
  adj.checkerId = checkerId;
  adj.checkerComment = comment?.trim() ?? null;
  adj.updatedAt = new Date().toISOString();

  recomputeReconciliation(adj.reconciliationId);

  store.approvals.push({
    id: uuidv4(),
    adjustmentId,
    action: "APPROVED",
    userId: checkerId,
    comment: comment?.trim() ?? null,
    timestamp: adj.updatedAt,
  });
  return adj;
}

export function rejectAdjustment(adjustmentId, checkerId, comment) {
  const store = getStore();
  const adj = store.adjustmentEntries.find(
    (a) => a.id === adjustmentId && !a.deletedAt,
  );
  if (!adj)
    throw Object.assign(new Error("Adjustment not found"), { status: 404 });
  if (adj.makerId === checkerId)
    throw Object.assign(new Error("No self-approval"), { status: 403 });
  if (adj.status !== ADJUSTMENT_STATUS.PENDING_APPROVAL)
    throw Object.assign(new Error("Not pending approval"), { status: 400 });
  if (!comment?.trim())
    throw Object.assign(new Error("Rejection reason is mandatory"), {
      status: 400,
    });

  adj.status = ADJUSTMENT_STATUS.REJECTED;
  adj.checkerId = checkerId;
  adj.checkerComment = comment.trim();
  adj.updatedAt = new Date().toISOString();

  const rec = store.reconciliations.find((r) => r.id === adj.reconciliationId);
  if (rec) {
    rec.status = RECONCILIATION_STATUS.REOPENED;
    rec.updatedAt = adj.updatedAt;
  }

  store.approvals.push({
    id: uuidv4(),
    adjustmentId,
    action: "REJECTED",
    userId: checkerId,
    comment: comment.trim(),
    timestamp: adj.updatedAt,
  });
  return adj;
}

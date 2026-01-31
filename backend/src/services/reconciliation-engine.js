/**
 * RECONCILIATION ENGINE – Contract implementation.
 *
 * ExpectedClosing = OpeningBalance + Additions - Amortization (± ApprovedAdjustmentsImpact)
 * ActualClosing = Trial Balance closing for same account, entity, period
 * Variance = ActualClosing - ExpectedClosing (after adjustments)
 * Status: CLOSED if abs(Variance) <= Tolerance, else OPEN
 *
 * Data priority: 1) PPREC (opening, additions, amortization), 2) Schedule (amortization = SUM creditAmount), 3) TB (actualClosing)
 */

import { v4 as uuidv4 } from "uuid";
import { getStore } from "../store/index.js";
import { RECONCILIATION_STATUS } from "../config/constants.js";

function getTolerance(entityId, periodId) {
  const store = getStore();
  const setting = store.toleranceSettings.find(
    (t) =>
      (t.entityId === entityId || !t.entityId) &&
      (t.periodId === periodId || !t.periodId) &&
      !t.deletedAt,
  );
  return Number(setting?.amount ?? 0);
}

export function matchEntityPeriod(line, entityId, periodId, fiscalYear) {
  const e = String(line.entity ?? line.entityId ?? "").trim();
  const p = String(
    line.fiscalPeriod ?? line.periodId ?? line.period ?? "",
  ).trim();
  const y = line.fiscalYear ?? line.year;
  if (entityId && e !== String(entityId).trim()) return false;
  if (periodId && p !== String(periodId).trim()) return false;
  if (fiscalYear != null && y != null && String(y) !== String(fiscalYear))
    return false;
  return true;
}

/**
 * Get PPREC values for (entity, period, prepaidAccount). Optional fiscalYear.
 */
export function getPprecValues(
  pprecLines,
  entityId,
  periodId,
  prepaidAccount,
  fiscalYear,
) {
  const line = (pprecLines || []).find(
    (l) =>
      matchEntityPeriod(l, entityId, periodId, fiscalYear) &&
      String(l.prepaidAccount ?? l.account ?? "").trim() ===
        String(prepaidAccount).trim(),
  );
  return line
    ? {
        openingBalance: Number(line.openingBalance) || 0,
        additions: Number(line.additions) || 0,
        amortization: Number(line.amortization) ?? null,
        source: "PPREC",
        lineId: line.id,
      }
    : null;
}

/**
 * Amortization from schedule_lines: SUM(creditAmount) for account === prepaidAccount, period match.
 */
export function getAmortizationFromSchedule(
  scheduleLines,
  entityId,
  periodId,
  prepaidAccount,
  fiscalYear,
) {
  const lines = (scheduleLines || []).filter(
    (l) =>
      matchEntityPeriod(l, entityId, periodId, fiscalYear) &&
      String(l.account ?? "").trim() === String(prepaidAccount).trim(),
  );
  const sum = lines.reduce((acc, l) => acc + (Number(l.creditAmount) || 0), 0);
  return { amortization: sum, lines, source: "schedule" };
}

/**
 * Actual closing from tb_lines for account, entity, period.
 */
export function getActualClosingFromTb(
  tbLines,
  entityId,
  periodId,
  account,
  fiscalYear,
) {
  const line = (tbLines || []).find(
    (l) =>
      matchEntityPeriod(l, entityId, periodId, fiscalYear) &&
      String(l.account ?? "").trim() === String(account).trim(),
  );
  return line
    ? {
        closingBalanceSigned: Number(line.closingBalanceSigned) ?? 0,
        lineId: line.id,
        line,
      }
    : null;
}

/**
 * Sum of approved adjustment impactOnPrepaid for this reconciliation.
 */
function getApprovedAdjustmentImpact(store, reconciliationId) {
  const entries = store.adjustmentEntries.filter(
    (a) =>
      !a.deletedAt &&
      a.reconciliationId === reconciliationId &&
      a.status === "APPROVED",
  );
  return entries.reduce((sum, a) => sum + (Number(a.impactOnPrepaid) || 0), 0);
}

/**
 * Compute reconciliation for one (entity, period, prepaidAccount).
 * Uses store.schedule_lines, store.tb_lines, store.pprec_lines.
 */
export function runOneReconciliation(
  entityId,
  fiscalYear,
  periodId,
  prepaidAccount,
  existingRec = null,
) {
  const store = getStore();
  const scheduleLines = store.schedule_lines || [];
  const tbLines = store.tb_lines || [];
  const pprecLines = store.pprec_lines || [];

  let openingBalance = 0;
  let additions = 0;
  let amortization = 0;
  let amortizationSource = "none";

  const pprec = getPprecValues(
    pprecLines,
    entityId,
    periodId,
    prepaidAccount,
    fiscalYear,
  );
  if (pprec) {
    openingBalance = pprec.openingBalance;
    additions = pprec.additions;
    if (pprec.amortization != null) {
      amortization = pprec.amortization;
      amortizationSource = "PPREC";
    }
  }
  if (amortizationSource !== "PPREC") {
    const sched = getAmortizationFromSchedule(
      scheduleLines,
      entityId,
      periodId,
      prepaidAccount,
      fiscalYear,
    );
    amortization = sched.amortization;
    amortizationSource = sched.lines.length ? "schedule" : "none";
  }

  const expectedClosing = openingBalance + additions - amortization;
  const tbResult = getActualClosingFromTb(
    tbLines,
    entityId,
    periodId,
    prepaidAccount,
    fiscalYear,
  );
  const actualClosing = tbResult != null ? tbResult.closingBalanceSigned : null;

  const tolerance = getTolerance(entityId, periodId);
  const recId = existingRec?.id ?? uuidv4();

  const approvedImpact = getApprovedAdjustmentImpact(store, recId);
  const expectedClosingAdjusted = expectedClosing + approvedImpact;
  const variance =
    actualClosing != null ? actualClosing - expectedClosingAdjusted : null;
  const status =
    variance != null && Math.abs(variance) <= tolerance
      ? RECONCILIATION_STATUS.CLOSED
      : RECONCILIATION_STATUS.OPEN;

  const now = new Date().toISOString();
  const record = {
    id: recId,
    entityId,
    fiscalYear: fiscalYear ?? null,
    periodId,
    prepaidAccount,
    openingBalance,
    additions,
    amortization,
    expectedClosing,
    expectedClosingAdjusted,
    actualClosing: actualClosing ?? null,
    variance: variance ?? null,
    status,
    toleranceUsed: tolerance,
    version: (existingRec?.version ?? 0) + 1,
    createdAt: existingRec?.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
  };

  if (!existingRec) {
    store.reconciliations.push(record);
  } else {
    const idx = store.reconciliations.findIndex((r) => r.id === existingRec.id);
    if (idx >= 0)
      store.reconciliations[idx] = { ...store.reconciliations[idx], ...record };
  }
  return record;
}

/**
 * Run all reconciliations for (entity, period): discover prepaid accounts from PPREC + schedule + TB.
 */
export function runAllReconciliations(
  entityId,
  fiscalYear,
  periodId,
  options = {},
) {
  const store = getStore();
  const { scheduleUploadId, tbUploadId, pprecUploadId } = options;

  const prepaidFromPprec = [
    ...new Set(
      (store.pprec_lines || [])
        .filter((l) => matchEntityPeriod(l, entityId, periodId, fiscalYear))
        .map((l) => String(l.prepaidAccount ?? l.account ?? "").trim())
        .filter(Boolean),
    ),
  ];
  const prepaidFromSchedule = [
    ...new Set(
      (store.schedule_lines || [])
        .filter((l) => matchEntityPeriod(l, entityId, periodId, fiscalYear))
        .map((l) => String(l.account ?? "").trim())
        .filter(Boolean),
    ),
  ];
  const prepaidFromTb = [
    ...new Set(
      (store.tb_lines || [])
        .filter((l) => matchEntityPeriod(l, entityId, periodId, fiscalYear))
        .map((l) => String(l.account ?? "").trim())
        .filter(Boolean),
    ),
  ];
  const allPrepaid = [
    ...new Set([...prepaidFromPprec, ...prepaidFromSchedule, ...prepaidFromTb]),
  ].filter(Boolean);

  const results = [];
  for (const prepaidAccount of allPrepaid) {
    const existing = store.reconciliations.find(
      (r) =>
        r.entityId === entityId &&
        r.periodId === periodId &&
        (r.prepaidAccount === prepaidAccount ||
          r.prepaidAccountId === prepaidAccount) &&
        !r.deletedAt,
    );
    const rec = runOneReconciliation(
      entityId,
      fiscalYear,
      periodId,
      prepaidAccount,
      existing ?? undefined,
    );
    results.push(rec);
  }
  return results;
}

/**
 * Recompute one reconciliation after adjustment approval (re-apply contract).
 */
export function recomputeReconciliation(reconciliationId) {
  const store = getStore();
  const rec = store.reconciliations.find(
    (r) => r.id === reconciliationId && !r.deletedAt,
  );
  if (!rec) return null;
  return runOneReconciliation(
    rec.entityId,
    rec.fiscalYear,
    rec.periodId,
    rec.prepaidAccount,
    rec,
  );
}

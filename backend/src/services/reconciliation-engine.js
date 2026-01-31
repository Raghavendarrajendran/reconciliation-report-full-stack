/**
 * RECONCILIATION ENGINE – Canonical formulas (DO NOT CHANGE).
 *
 * A) Begin in YYYY Prepaid = Original prepaid booked in YYYY − Amortization till report date (from schedule, PrepaidStartYear=YYYY, ApplyDate<=ReportDate)
 * B) Total Subsystem = SUM(Begin in 2021..2025 Prepaid) = Expected Closing (Opening + Additions − Amortization)
 * C) GL Balance = Closing balance from TB (entity, account, period)
 * D) Difference = Total Subsystem − GL Balance
 * E) Recon Entries = SUM(Approved adjustment impacts: Debit Prepaid → +Amount, Credit Prepaid → −Amount)
 * F) Final Difference = Difference − Recon Entries
 * G) Status = CLOSED if ABS(Final Difference) ≤ Tolerance else OPEN
 *
 * Data: Prepayment Schedule (amortization = CreditAmount, prepaidStartYear), PPREC (opening, additions, amortization), TB (closing).
 */

import { v4 as uuidv4 } from "uuid";
import { getStore } from "../store/index.js";
import { RECONCILIATION_STATUS } from "../config/constants.js";

const DASHBOARD_YEARS = [2021, 2022, 2023, 2024, 2025];

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

/**
 * Report date for "as on today" / ApplyDate <= Report Date.
 * Uses period endDate if available; else parses periodId/fiscalPeriod (e.g. 2024_12 → 2024-12-31).
 */
export function getReportDateFromPeriod(periodId, fiscalYear, fiscalPeriod) {
  const store = getStore();
  if (periodId) {
    const period = store.fiscalPeriods.find(
      (p) => p.id === periodId && !p.deletedAt,
    );
    if (period?.endDate) return period.endDate;
    const code = (period?.code ?? String(periodId)).replace(/\s+/g, "_");
    const match = code.match(/^(\d{4})[-_](\d{1,2})$/);
    if (match) {
      const y = Number(match[1]);
      const m = Number(match[2]);
      const lastDay = new Date(y, m, 0);
      return (
        lastDay.getFullYear() +
        "-" +
        String(lastDay.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(lastDay.getDate()).padStart(2, "0")
      );
    }
  }
  const y = fiscalYear != null ? String(fiscalYear).trim() : "";
  const p = fiscalPeriod != null ? String(fiscalPeriod).trim() : "";
  if (/^\d{4}$/.test(y) && /^\d{1,2}$/.test(p)) {
    const lastDay = new Date(Number(y), Number(p), 0);
    return (
      lastDay.getFullYear() +
      "-" +
      String(lastDay.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(lastDay.getDate()).padStart(2, "0")
    );
  }
  return null;
}

/** Parse date string to YYYY-MM-DD for comparison; returns null if unparseable. */
function parseDateToYmd(val) {
  if (!val) return null;
  const s = String(val).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime()))
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  return null;
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
 * Original prepaid amount booked in year YYYY = SUM(PPREC additions) for entity, prepaidAccount, fiscalYear = YYYY (all periods in that year).
 */
export function getOriginalPrepaidBookedInYear(
  pprecLines,
  entityId,
  prepaidAccount,
  year,
) {
  const lines = (pprecLines || []).filter(
    (l) =>
      String(l.entity ?? l.entityId ?? "").trim() === String(entityId).trim() &&
      String(l.prepaidAccount ?? l.account ?? "").trim() ===
        String(prepaidAccount).trim() &&
      String(l.fiscalYear ?? "").trim() === String(year).trim(),
  );
  return lines.reduce((sum, l) => sum + (Number(l.additions) || 0), 0);
}

/**
 * Amortization till report date from schedule: SUM(CreditAmount) WHERE PrepaidStartYear = year AND ApplyDate <= reportDate, entity and account match.
 */
export function getAmortizationTillReportDate(
  scheduleLines,
  entityId,
  reportDate,
  prepaidAccount,
  prepaidStartYear,
) {
  const reportYmd = reportDate ? parseDateToYmd(reportDate) : null;
  const lines = (scheduleLines || []).filter((l) => {
    if (String(l.entity ?? l.entityId ?? "").trim() !== String(entityId).trim())
      return false;
    if (String(l.account ?? "").trim() !== String(prepaidAccount).trim())
      return false;
    const startYear = String(l.prepaidStartYear ?? l.fiscalYear ?? "").trim();
    if (startYear !== String(prepaidStartYear).trim()) return false;
    if (reportYmd && l.applyDate) {
      const applyYmd = parseDateToYmd(l.applyDate);
      if (applyYmd && applyYmd > reportYmd) return false;
    }
    return true;
  });
  const amortization = lines.reduce(
    (acc, l) => acc + (Number(l.creditAmount) || 0),
    0,
  );
  return { amortization, lines };
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
 * Recon Entries: Debit Prepaid → +Amount, Credit Prepaid → −Amount.
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
 * Produces dashboard columns: Begin in 2021..2025 Prepaid, Total Subsystem, GL Balance, Difference, Recon Entries, Final Difference, Status.
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

  const reportDate = getReportDateFromPeriod(periodId, fiscalYear, null);
  const period = periodId
    ? store.fiscalPeriods.find((p) => p.id === periodId && !p.deletedAt)
    : null;
  const fiscalPeriodStr = period?.code ?? period?.name ?? null;

  const beginInYear = {};
  for (const y of DASHBOARD_YEARS) {
    const original = getOriginalPrepaidBookedInYear(
      pprecLines,
      entityId,
      prepaidAccount,
      y,
    );
    const { amortization: amortToDate } = getAmortizationTillReportDate(
      scheduleLines,
      entityId,
      reportDate,
      prepaidAccount,
      y,
    );
    beginInYear[y] = original - amortToDate;
  }

  const totalSubsystem = DASHBOARD_YEARS.reduce(
    (s, y) => s + (beginInYear[y] ?? 0),
    0,
  );

  const tbResult = getActualClosingFromTb(
    tbLines,
    entityId,
    periodId,
    prepaidAccount,
    fiscalYear,
  );
  const glBalance = tbResult != null ? tbResult.closingBalanceSigned : null;

  const difference = glBalance != null ? totalSubsystem - glBalance : null;

  const tolerance = getTolerance(entityId, periodId);
  const recId = existingRec?.id ?? uuidv4();
  const reconEntries = getApprovedAdjustmentImpact(store, recId);
  const finalDifference = difference != null ? difference - reconEntries : null;
  const status =
    finalDifference != null && Math.abs(finalDifference) <= tolerance
      ? RECONCILIATION_STATUS.CLOSED
      : RECONCILIATION_STATUS.OPEN;

  const pprec = getPprecValues(
    pprecLines,
    entityId,
    periodId,
    prepaidAccount,
    fiscalYear,
  );
  let openingBalance = 0;
  let additions = 0;
  let amortization = 0;
  if (pprec) {
    openingBalance = pprec.openingBalance;
    additions = pprec.additions;
    amortization = pprec.amortization ?? 0;
  }
  const sched = getAmortizationFromSchedule(
    scheduleLines,
    entityId,
    periodId,
    prepaidAccount,
    fiscalYear,
  );
  if (pprec?.amortization == null) amortization = sched.amortization;
  const expectedClosing = openingBalance + additions - amortization;
  const expectedClosingAdjusted = totalSubsystem + reconEntries;
  const variance =
    glBalance != null ? glBalance - expectedClosingAdjusted : null;

  const now = new Date().toISOString();
  const record = {
    id: recId,
    entityId,
    fiscalYear: fiscalYear ?? null,
    periodId,
    prepaidAccount,
    beginIn2021Prepaid: beginInYear[2021] ?? 0,
    beginIn2022Prepaid: beginInYear[2022] ?? 0,
    beginIn2023Prepaid: beginInYear[2023] ?? 0,
    beginIn2024Prepaid: beginInYear[2024] ?? 0,
    beginIn2025Prepaid: beginInYear[2025] ?? 0,
    totalSubsystem,
    glBalance: glBalance ?? null,
    difference: difference ?? null,
    reconEntries,
    finalDifference: finalDifference ?? null,
    status,
    toleranceUsed: tolerance,
    openingBalance,
    additions,
    amortization,
    expectedClosing,
    expectedClosingAdjusted,
    actualClosing: glBalance ?? null,
    variance: variance ?? null,
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

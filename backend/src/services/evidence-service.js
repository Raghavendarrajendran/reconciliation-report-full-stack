/**
 * Evidence / Explanation Engine.
 * For each reconciliation record, build an Evidence object for audit and UI.
 */

import { getStore } from "../store/index.js";
import {
  getPprecValues,
  getAmortizationFromSchedule,
  getActualClosingFromTb,
} from "./reconciliation-engine.js";

/**
 * Build Evidence object for a reconciliation record.
 */
export function buildEvidence(reconciliationId) {
  const store = getStore();
  const rec = store.reconciliations.find(
    (r) => r.id === reconciliationId && !r.deletedAt,
  );
  if (!rec) return null;

  const { entityId, fiscalYear, periodId, prepaidAccount } = rec;
  const scheduleLines = store.schedule_lines || [];
  const tbLines = store.tb_lines || [];
  const pprecLines = store.pprec_lines || [];

  const tbResult = getActualClosingFromTb(
    tbLines,
    entityId,
    periodId,
    prepaidAccount,
    fiscalYear,
  );
  const pprecValues = getPprecValues(
    pprecLines,
    entityId,
    periodId,
    prepaidAccount,
    fiscalYear,
  );
  const scheduleResult = getAmortizationFromSchedule(
    scheduleLines,
    entityId,
    periodId,
    prepaidAccount,
    fiscalYear,
  );

  const approvedAdjustments = (store.adjustmentEntries || []).filter(
    (a) =>
      !a.deletedAt &&
      a.reconciliationId === reconciliationId &&
      a.status === "APPROVED",
  );

  const warnings = [];
  if (!tbResult)
    warnings.push({
      code: "MISSING_TB_ROW",
      message: "No Trial Balance row found for this account and period.",
    });
  if (
    scheduleResult.source === "schedule" &&
    scheduleResult.lines.length === 0 &&
    !pprecValues?.amortization
  )
    warnings.push({
      code: "MISSING_SCHEDULE_AMORTIZATION",
      message:
        "No schedule lines found for amortization; PPREC amortization not present.",
    });
  const scheduleIds = (scheduleResult.lines || []).map(
    (l) => l.id ?? l._rowIndex,
  );
  const duplicateIds = scheduleIds.filter(
    (id, i) => scheduleIds.indexOf(id) !== i,
  );
  if (duplicateIds.length)
    warnings.push({
      code: "DUPLICATE_SCHEDULE_LINES",
      message: "Duplicate schedule line references detected.",
      detail: duplicateIds,
    });

  const pprecLine = pprecValues?.lineId
    ? pprecLines.find((l) => l.id === pprecValues.lineId)
    : null;
  return {
    reconciliationId,
    sourceTbRow: tbResult
      ? {
          account: tbResult.line?.account ?? prepaidAccount,
          closingBalanceSigned: tbResult.closingBalanceSigned,
          lineId: tbResult.lineId,
          raw: tbResult.line,
        }
      : null,
    pprecValues: pprecValues
      ? {
          openingBalance: pprecValues.openingBalance,
          additions: pprecValues.additions,
          amortization: pprecValues.amortization,
          source: pprecValues.source,
          lineId: pprecValues.lineId,
        }
      : null,
    pprecLines: pprecLine ? [pprecLine] : [],
    scheduleLinesContributing: (scheduleResult.lines || []).map((l) => ({
      id: l.id,
      account: l.account,
      creditAmount: l.creditAmount,
      debitAmount: l.debitAmount,
      applyDate: l.applyDate,
      headerDesc: l.headerDesc,
    })),
    approvedAdjustments: approvedAdjustments.map((a) => ({
      id: a.id,
      debitAccount: a.debitAccount,
      creditAccount: a.creditAccount,
      amount: a.amount,
      impactOnPrepaid: a.impactOnPrepaid,
    })),
    warnings,
    expectedClosingFormula: {
      openingBalance: rec.openingBalance,
      additions: rec.additions,
      amortization: rec.amortization,
      expectedClosing: rec.expectedClosing,
      adjustmentImpact:
        (rec.expectedClosingAdjusted ?? rec.expectedClosing) -
        rec.expectedClosing,
      expectedClosingAdjusted:
        rec.expectedClosingAdjusted ?? rec.expectedClosing,
    },
    actualClosing: rec.actualClosing,
    variance: rec.variance,
    status: rec.status,
    toleranceUsed: rec.toleranceUsed,
  };
}

/**
 * Evidence / Explanation Engine.
 * For each reconciliation record, build an Evidence object for audit and UI drill-down.
 * Detail view: Expected Closing Breakdown, Schedule Evidence, PPREC Evidence, TB Evidence, Variance Explanation.
 */

import { getStore } from "../store/index.js";
import {
  getPprecValues,
  getAmortizationFromSchedule,
  getAmortizationTillReportDate,
  getActualClosingFromTb,
  getReportDateFromPeriod,
  getOriginalPrepaidBookedInYear,
} from "./reconciliation-engine.js";

/**
 * Build Evidence object for a reconciliation record (drill-down / accounting story view).
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

  const reportDate = getReportDateFromPeriod(periodId, fiscalYear, null);
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

  const years = [2021, 2022, 2023, 2024, 2025];
  const scheduleByYear = {};
  for (const y of years) {
    const original = getOriginalPrepaidBookedInYear(
      pprecLines,
      entityId,
      prepaidAccount,
      y,
    );
    const { amortization, lines } = getAmortizationTillReportDate(
      scheduleLines,
      entityId,
      reportDate,
      prepaidAccount,
      y,
    );
    scheduleByYear[y] = {
      originalBookedInYear: original,
      amortizationTillReportDate: amortization,
      beginInYearPrepaid: rec[`beginIn${y}Prepaid`] ?? original - amortization,
      scheduleLines: lines.map((l) => ({
        id: l.id,
        account: l.account,
        creditAmount: l.creditAmount,
        debitAmount: l.debitAmount,
        applyDate: l.applyDate,
        headerDesc: l.headerDesc,
        prepaidStartYear: l.prepaidStartYear ?? l.fiscalYear,
      })),
    };
  }

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

  const totalSubsystem = rec.totalSubsystem ?? 0;
  const glBalance = rec.glBalance ?? rec.actualClosing;
  const difference =
    rec.difference ?? (glBalance != null ? totalSubsystem - glBalance : null);
  const reconEntries = rec.reconEntries ?? 0;
  const finalDifference =
    rec.finalDifference ??
    (difference != null ? difference - reconEntries : null);

  return {
    reconciliationId,
    reportDate,
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
      prepaidStartYear: l.prepaidStartYear ?? l.fiscalYear,
    })),
    scheduleByYear,
    approvedAdjustments: approvedAdjustments.map((a) => ({
      id: a.id,
      debitAccount: a.debitAccount,
      creditAccount: a.creditAccount,
      amount: a.amount,
      impactOnPrepaid: a.impactOnPrepaid,
    })),
    warnings,
    expectedClosingBreakdown: {
      openingBalance: rec.openingBalance,
      additions: rec.additions,
      amortization: rec.amortization,
      expectedClosing: rec.expectedClosing,
      reconEntries,
      totalSubsystem,
      formula:
        "Opening + Additions − Amortization ± Recon Entries = Total Subsystem",
    },
    expectedClosingFormula: {
      openingBalance: rec.openingBalance,
      additions: rec.additions,
      amortization: rec.amortization,
      expectedClosing: rec.expectedClosing,
      adjustmentImpact: reconEntries,
      expectedClosingAdjusted:
        rec.expectedClosingAdjusted ?? rec.expectedClosing,
    },
    dashboardColumns: {
      beginIn2021Prepaid: rec.beginIn2021Prepaid ?? 0,
      beginIn2022Prepaid: rec.beginIn2022Prepaid ?? 0,
      beginIn2023Prepaid: rec.beginIn2023Prepaid ?? 0,
      beginIn2024Prepaid: rec.beginIn2024Prepaid ?? 0,
      beginIn2025Prepaid: rec.beginIn2025Prepaid ?? 0,
      totalSubsystem,
      glBalance,
      difference,
      reconEntries,
      finalDifference,
    },
    actualClosing: glBalance ?? rec.actualClosing,
    variance: rec.variance,
    status: rec.status,
    toleranceUsed: rec.toleranceUsed,
    varianceExplanation:
      glBalance != null && difference != null
        ? `Total Subsystem (${totalSubsystem}) − GL Balance (${glBalance}) = Difference (${difference}). After Recon Entries (${reconEntries}): Final Difference = ${finalDifference}. Status: ${rec.status} (tolerance ${rec.toleranceUsed}).`
        : "GL Balance not available; cannot compute variance.",
  };
}

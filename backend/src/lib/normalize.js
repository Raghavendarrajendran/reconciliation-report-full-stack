/**
 * Normalize raw upload rows into canonical line shapes for reconciliation.
 * Accepts rows with normalized headers (lowercase, underscores).
 */

import { v4 as uuidv4 } from "uuid";

const n = (v) => (v === "" || v == null ? null : Number(v));
const s = (v) => (v === "" || v == null ? null : String(v).trim() || null);

function pick(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
  }
  return null;
}

/**
 * Canonical schedule_lines shape (journal-line level amortization).
 */
export function toScheduleLine(row, index, uploadId) {
  const entity = s(pick(row, "entity", "company", "entity_id", "company_id"));
  const fiscalYear = s(pick(row, "fiscal_year", "fiscalyear", "year"));
  const fiscalPeriod = s(
    pick(row, "fiscal_period", "fiscalperiod", "period", "period_id"),
  );
  const applyDate = s(
    pick(row, "apply_date", "applydate", "posting_date", "date"),
  );
  const recurNum = n(pick(row, "recur_num", "recurnum", "recur_no"));
  const recurLine = n(pick(row, "recur_line", "recurline", "line_no"));
  const headerDesc = s(
    pick(row, "header_desc", "headerdesc", "description", "header"),
  );
  const account = s(
    pick(row, "account", "account_code", "accountcode", "gl_account"),
  );
  const expenseAccount = s(
    pick(row, "expense_account", "expenseaccount", "expense_account_code"),
  );
  const accountDesc = s(
    pick(row, "account_desc", "accountdesc", "account_description"),
  );
  const debitAmount = n(pick(row, "debit_amount", "debitamount", "debit")) ?? 0;
  const creditAmount =
    n(pick(row, "credit_amount", "creditamount", "credit")) ?? 0;
  const amountSigned = debitAmount - creditAmount;
  return {
    id: uuidv4(),
    uploadId: uploadId ?? null,
    entity,
    fiscalYear,
    fiscalPeriod,
    applyDate,
    recurNum,
    recurLine,
    headerDesc,
    account,
    expenseAccount: expenseAccount ?? null,
    accountDesc,
    debitAmount,
    creditAmount,
    amountSigned,
    _rowIndex: index,
  };
}

/**
 * Canonical tb_lines shape (closing balances).
 */
export function toTbLine(row, index, uploadId) {
  const entity = s(pick(row, "entity", "company", "entity_id", "company_id"));
  const fiscalYear = s(pick(row, "fiscal_year", "fiscalyear", "year"));
  const fiscalPeriod = s(
    pick(row, "fiscal_period", "fiscalperiod", "period", "period_id"),
  );
  const account = s(
    pick(row, "account", "account_code", "accountcode", "gl_account"),
  );
  const glHead1Desc = s(
    pick(row, "gl_head1_desc", "glhead1desc", "head1", "category"),
  );
  const glHead2Desc = s(pick(row, "gl_head2_desc", "glhead2desc", "head2"));
  const glHead3Desc = s(pick(row, "gl_head3_desc", "glhead3desc", "head3"));
  let closingBalanceSigned = n(
    pick(
      row,
      "closing_balance_signed",
      "closingbalancesigned",
      "closing_balance",
      "closingbalance",
      "balance",
      "net",
    ),
  );
  if (closingBalanceSigned == null) {
    const debit = n(pick(row, "debit", "debit_amount")) ?? 0;
    const credit = n(pick(row, "credit", "credit_amount")) ?? 0;
    closingBalanceSigned = debit - credit;
  }
  return {
    id: uuidv4(),
    uploadId: uploadId ?? null,
    entity,
    fiscalYear,
    fiscalPeriod,
    account,
    glHead1Desc,
    glHead2Desc,
    glHead3Desc,
    closingBalanceSigned: closingBalanceSigned ?? 0,
    _rowIndex: index,
  };
}

/**
 * Canonical pprec_lines shape (reconciliation working/movement).
 */
export function toPprecLine(row, index, uploadId) {
  const entity = s(pick(row, "entity", "company", "entity_id", "company_id"));
  const fiscalYear = s(pick(row, "fiscal_year", "fiscalyear", "year"));
  const fiscalPeriod = s(
    pick(row, "fiscal_period", "fiscalperiod", "period", "period_id"),
  );
  const prepaidAccount = s(
    pick(row, "prepaid_account", "prepaidaccount", "account", "account_code"),
  );
  const openingBalance =
    n(pick(row, "opening_balance", "openingbalance", "opening")) ?? 0;
  const additions =
    n(
      pick(
        row,
        "additions",
        "new_prepayments",
        "newprepayments",
        "additions_amount",
      ),
    ) ?? 0;
  const amortization =
    n(pick(row, "amortization", "amort", "amortization_amount")) ?? 0;
  const expectedClosing = openingBalance + additions - amortization;
  return {
    id: uuidv4(),
    uploadId: uploadId ?? null,
    entity,
    fiscalYear,
    fiscalPeriod,
    prepaidAccount,
    openingBalance,
    additions,
    amortization,
    expectedClosing,
    _rowIndex: index,
  };
}

export function normalizeScheduleRows(rows, uploadId) {
  return (rows || []).map((r, i) => toScheduleLine(r, i, uploadId));
}

export function normalizeTbRows(rows, uploadId) {
  return (rows || []).map((r, i) => toTbLine(r, i, uploadId));
}

export function normalizePprecRows(rows, uploadId) {
  return (rows || []).map((r, i) => toPprecLine(r, i, uploadId));
}

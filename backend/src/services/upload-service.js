import { v4 as uuidv4 } from "uuid";
import XLSX from "xlsx";
import { getStore } from "../store/index.js";
import { ensureEntityByName } from "./entity-service.js";
import { ensurePeriodByFiscal } from "./period-service.js";
import {
  normalizeScheduleRows,
  normalizeTbRows,
  normalizePprecRows,
} from "../lib/normalize.js";

/** Resolve distinct company/entity names from lines to entityIds; auto-create entities, no duplicates. */
function resolveEntityIdsFromLines(normalizedLines, formEntityId) {
  const nameToId = {};
  const distinctNames = [
    ...new Set(
      (normalizedLines || [])
        .map((l) =>
          l.entity != null && String(l.entity).trim() !== ""
            ? String(l.entity).trim()
            : null,
        )
        .filter(Boolean),
    ),
  ];
  for (const name of distinctNames) {
    const entity = ensureEntityByName(name);
    if (entity) nameToId[name] = entity.id;
  }
  return (line) => {
    const name =
      line.entity != null && String(line.entity).trim() !== ""
        ? String(line.entity).trim()
        : null;
    return name ? (nameToId[name] ?? formEntityId) : formEntityId;
  };
}

/** Resolve distinct (fiscalYear, fiscalPeriod) from lines to periodIds; auto-create periods in master, no duplicates. */
function resolvePeriodIdsFromLines(normalizedLines, formPeriodId) {
  const keyToId = {};
  const seen = new Set();
  for (const l of normalizedLines || []) {
    const y =
      l.fiscalYear != null && String(l.fiscalYear).trim() !== ""
        ? String(l.fiscalYear).trim()
        : null;
    const p =
      l.fiscalPeriod != null && String(l.fiscalPeriod).trim() !== ""
        ? String(l.fiscalPeriod).trim()
        : null;
    if (y || p) {
      const key = `${y ?? ""}_${p ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        const period = ensurePeriodByFiscal(y, p);
        if (period) keyToId[key] = period.id;
      }
    }
  }
  return (line) => {
    const y =
      line.fiscalYear != null && String(line.fiscalYear).trim() !== ""
        ? String(line.fiscalYear).trim()
        : null;
    const p =
      line.fiscalPeriod != null && String(line.fiscalPeriod).trim() !== ""
        ? String(line.fiscalPeriod).trim()
        : null;
    const key = `${y ?? ""}_${p ?? ""}`;
    return keyToId[key] ?? formPeriodId;
  };
}

/**
 * Parse Excel buffer; return { sheets: string[], rowsBySheet: { [sheet]: rows[] } }.
 */
export function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheets = workbook.SheetNames;
  const rowsBySheet = {};
  for (const name of sheets) {
    const sheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
    rowsBySheet[name] = data;
  }
  return { sheets, rowsBySheet };
}

/**
 * Normalize column names: trim, lowercase, replace spaces with underscore.
 */
export function normalizeHeaders(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const key = String(k).trim().toLowerCase().replace(/\s+/g, "_");
    out[key] = v;
  }
  return out;
}

/**
 * Parse Excel buffer and return full rows for a single sheet (normalized headers).
 */
export function parseExcelSheet(buffer, sheetName) {
  const { sheets, rowsBySheet } = parseExcel(buffer);
  const name = sheetName || sheets[0];
  const rows = rowsBySheet[name] || [];
  return rows.map((r) => normalizeHeaders(r));
}

/**
 * Save prepayment schedule upload. rows = array of objects (already column-mapped).
 */
export function savePrepaymentSchedule({
  entityId,
  periodId,
  rows,
  version = 1,
  uploadedBy,
}) {
  const store = getStore();
  const id = uuidv4();
  const now = new Date().toISOString();
  const record = {
    id,
    entityId: entityId ?? null,
    periodId: periodId ?? null,
    rows: Array.isArray(rows) ? rows : [],
    version,
    uploadedBy: uploadedBy ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  store.prepaymentSchedules.push(record);
  const normalizedRaw = normalizeScheduleRows(record.rows, record.id);
  const resolveEntityId = resolveEntityIdsFromLines(
    normalizedRaw,
    record.entityId,
  );
  const resolvePeriodId = resolvePeriodIdsFromLines(
    normalizedRaw,
    record.periodId,
  );
  const normalized = normalizedRaw.map((l) => {
    const entityId = resolveEntityId(l);
    const periodId =
      resolvePeriodId(l) ?? record.periodId ?? l.periodId ?? null;
    return {
      ...l,
      entity: entityId ?? l.entity,
      entityId: entityId ?? l.entityId ?? null,
      fiscalYear: l.fiscalYear ?? null,
      fiscalPeriod: l.fiscalPeriod ?? null,
      periodId,
    };
  });
  store.schedule_lines.push(...normalized);
  return record;
}

/**
 * Save trial balance upload.
 */
export function saveTrialBalance({
  entityId,
  periodId,
  rows,
  version = 1,
  uploadedBy,
}) {
  const store = getStore();
  const id = uuidv4();
  const now = new Date().toISOString();
  const record = {
    id,
    entityId: entityId ?? null,
    periodId: periodId ?? null,
    rows: Array.isArray(rows) ? rows : [],
    version,
    uploadedBy: uploadedBy ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  store.trialBalances.push(record);
  const normalizedRaw = normalizeTbRows(record.rows, record.id);
  const resolveEntityId = resolveEntityIdsFromLines(
    normalizedRaw,
    record.entityId,
  );
  const resolvePeriodId = resolvePeriodIdsFromLines(
    normalizedRaw,
    record.periodId,
  );
  const normalized = normalizedRaw.map((l) => {
    const entityId = resolveEntityId(l);
    const periodId =
      resolvePeriodId(l) ?? record.periodId ?? l.periodId ?? null;
    return {
      ...l,
      entity: entityId ?? l.entity,
      entityId: entityId ?? l.entityId ?? null,
      fiscalYear: l.fiscalYear ?? null,
      fiscalPeriod: l.fiscalPeriod ?? null,
      periodId,
    };
  });
  store.tb_lines.push(...normalized);
  return record;
}

/**
 * Save PPREC upload (reconciliation working/movement). Normalize into pprec_lines.
 */
export function savePprecUpload({
  entityId,
  periodId,
  fiscalYear,
  rows,
  version = 1,
  uploadedBy,
}) {
  const store = getStore();
  const id = uuidv4();
  const now = new Date().toISOString();
  const record = {
    id,
    entityId: entityId ?? null,
    periodId: periodId ?? null,
    fiscalYear: fiscalYear ?? null,
    rows: Array.isArray(rows) ? rows : [],
    version,
    uploadedBy: uploadedBy ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  store.pprecUploads.push(record);
  const normalizedRaw = normalizePprecRows(record.rows, record.id);
  const resolveEntityId = resolveEntityIdsFromLines(
    normalizedRaw,
    record.entityId,
  );
  const resolvePeriodId = resolvePeriodIdsFromLines(
    normalizedRaw,
    record.periodId,
  );
  const normalized = normalizedRaw.map((l) => {
    const entityId = resolveEntityId(l);
    const periodId =
      resolvePeriodId(l) ?? record.periodId ?? l.periodId ?? null;
    return {
      ...l,
      entity: entityId ?? l.entity,
      entityId: entityId ?? l.entityId ?? null,
      fiscalYear: l.fiscalYear ?? record.fiscalYear ?? null,
      fiscalPeriod: l.fiscalPeriod ?? null,
      periodId,
    };
  });
  store.pprec_lines.push(...normalized);
  return record;
}

export function listPrepaymentSchedules(entityId = null, periodId = null) {
  const store = getStore();
  return store.prepaymentSchedules.filter((s) => {
    if (s.deletedAt) return false;
    if (entityId && s.entityId !== entityId) return false;
    if (periodId && s.periodId !== periodId) return false;
    return true;
  });
}

export function listTrialBalances(entityId = null, periodId = null) {
  const store = getStore();
  return store.trialBalances.filter((t) => {
    if (t.deletedAt) return false;
    if (entityId && t.entityId !== entityId) return false;
    if (periodId && t.periodId !== periodId) return false;
    return true;
  });
}

export function getPrepaymentSchedule(id) {
  const store = getStore();
  return (
    store.prepaymentSchedules.find((s) => s.id === id && !s.deletedAt) ?? null
  );
}

export function getTrialBalance(id) {
  const store = getStore();
  return store.trialBalances.find((t) => t.id === id && !t.deletedAt) ?? null;
}

export function listPprecUploads(entityId = null, periodId = null) {
  const store = getStore();
  return store.pprecUploads.filter((p) => {
    if (p.deletedAt) return false;
    if (entityId && p.entityId !== entityId) return false;
    if (periodId && p.periodId !== periodId) return false;
    return true;
  });
}

export function getPprecUpload(id) {
  const store = getStore();
  return store.pprecUploads.find((p) => p.id === id && !p.deletedAt) ?? null;
}

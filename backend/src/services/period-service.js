import { v4 as uuidv4 } from "uuid";
import { getStore } from "../store/index.js";

export function listPeriods(entityId = null) {
  const store = getStore();
  let list = store.fiscalPeriods.filter((p) => !p.deletedAt);
  if (entityId)
    list = list.filter((p) => !p.entityId || p.entityId === entityId);
  return list.sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
}

export function getPeriod(id) {
  const store = getStore();
  return store.fiscalPeriods.find((p) => p.id === id && !p.deletedAt) ?? null;
}

/** Build a stable code from fiscal year + period for matching. */
function fiscalKey(fiscalYear, fiscalPeriod) {
  const y = fiscalYear != null ? String(fiscalYear).trim() : "";
  const p = fiscalPeriod != null ? String(fiscalPeriod).trim() : "";
  const combined = [y, p].filter(Boolean).join("_");
  return (
    combined.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "") || "PERIOD"
  );
}

/** Find period by fiscal year and period from sheet (code or name match). No duplicate. */
export function getPeriodByFiscal(fiscalYear, fiscalPeriod) {
  if (
    (fiscalYear == null || String(fiscalYear).trim() === "") &&
    (fiscalPeriod == null || String(fiscalPeriod).trim() === "")
  )
    return null;
  const store = getStore();
  const key = fiscalKey(fiscalYear, fiscalPeriod);
  const keyLower = key.toLowerCase();
  return (
    store.fiscalPeriods.find((p) => {
      if (p.deletedAt) return false;
      const codeNorm = p.code ? p.code.replace(/\s+/g, "_").toLowerCase() : "";
      const nameNorm = p.name ? p.name.replace(/\s+/g, "_").toLowerCase() : "";
      return codeNorm === keyLower || nameNorm === keyLower;
    }) ?? null
  );
}

/** Get or create period from fiscal year + period (e.g. from Excel). No duplicate. */
export function ensurePeriodByFiscal(fiscalYear, fiscalPeriod) {
  if (
    (fiscalYear == null || String(fiscalYear).trim() === "") &&
    (fiscalPeriod == null || String(fiscalPeriod).trim() === "")
  )
    return null;
  const existing = getPeriodByFiscal(fiscalYear, fiscalPeriod);
  if (existing) return existing;
  const y = fiscalYear != null ? String(fiscalYear).trim() : "";
  const p = fiscalPeriod != null ? String(fiscalPeriod).trim() : "";
  const name = [y, p].filter(Boolean).join(" ").trim() || "Unknown Period";
  const code = fiscalKey(fiscalYear, fiscalPeriod);
  const store = getStore();
  const codeExists = store.fiscalPeriods.some(
    (f) =>
      !f.deletedAt && f.code && f.code.toUpperCase() === code.toUpperCase(),
  );
  const finalCode = codeExists ? `${code}_${Date.now().toString(36)}` : code;
  return createPeriod({
    code: finalCode,
    name,
    startDate: y && /^\d{4}$/.test(y) ? `${y}-01-01` : "",
    endDate: y && /^\d{4}$/.test(y) ? `${y}-12-31` : "",
  });
}

export function createPeriod(data) {
  const store = getStore();
  const id = uuidv4();
  const now = new Date().toISOString();
  const period = {
    id,
    entityId: data.entityId ?? null,
    code: data.code ?? "",
    name: data.name ?? "",
    startDate: data.startDate ?? "",
    endDate: data.endDate ?? "",
    isClosed: data.isClosed ?? false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  store.fiscalPeriods.push(period);
  return period;
}

export function updatePeriod(id, data) {
  const store = getStore();
  const period = store.fiscalPeriods.find((p) => p.id === id && !p.deletedAt);
  if (!period) return null;
  if (data.code !== undefined) period.code = data.code;
  if (data.name !== undefined) period.name = data.name;
  if (data.startDate !== undefined) period.startDate = data.startDate;
  if (data.endDate !== undefined) period.endDate = data.endDate;
  if (data.isClosed !== undefined) period.isClosed = data.isClosed;
  if (data.entityId !== undefined) period.entityId = data.entityId;
  period.updatedAt = new Date().toISOString();
  return period;
}

export function softDeletePeriod(id) {
  const store = getStore();
  const period = store.fiscalPeriods.find((p) => p.id === id && !p.deletedAt);
  if (!period) return null;
  period.deletedAt = new Date().toISOString();
  return period;
}

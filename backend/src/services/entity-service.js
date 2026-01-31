import { v4 as uuidv4 } from "uuid";
import { getStore } from "../store/index.js";

export function listEntities(includeDeleted = false) {
  const store = getStore();
  return store.entities.filter((e) => includeDeleted || !e.deletedAt);
}

export function getEntity(id) {
  const store = getStore();
  return store.entities.find((e) => e.id === id && !e.deletedAt) ?? null;
}

/** Find entity by name (case-insensitive, trimmed). Prevents duplicate by name. */
export function getEntityByName(name) {
  if (name == null || String(name).trim() === "") return null;
  const store = getStore();
  const key = String(name).trim().toLowerCase();
  return (
    store.entities.find(
      (e) =>
        !e.deletedAt &&
        String(e.name || "")
          .trim()
          .toLowerCase() === key,
    ) ?? null
  );
}

/** Get or create entity by company name. No duplicate: same name always returns same entity. */
export function ensureEntityByName(companyName) {
  if (companyName == null || String(companyName).trim() === "") return null;
  const existing = getEntityByName(companyName);
  if (existing) return existing;
  const name = String(companyName).trim();
  const code =
    name
      .toUpperCase()
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]/g, "") || "ENTITY";
  const store = getStore();
  const codeExists = store.entities.some(
    (e) =>
      !e.deletedAt && e.code && e.code.toUpperCase() === code.toUpperCase(),
  );
  const finalCode = codeExists ? `${code}_${Date.now().toString(36)}` : code;
  return createEntity({ name, code: finalCode });
}

export function createEntity(data) {
  const store = getStore();
  const id = uuidv4();
  const now = new Date().toISOString();
  const entity = {
    id,
    code: data.code ?? "",
    name: data.name ?? "",
    currency: data.currency ?? "USD",
    metadata: data.metadata ?? {},
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  store.entities.push(entity);
  return entity;
}

export function updateEntity(id, data) {
  const store = getStore();
  const entity = store.entities.find((e) => e.id === id && !e.deletedAt);
  if (!entity) return null;
  if (data.code !== undefined) entity.code = data.code;
  if (data.name !== undefined) entity.name = data.name;
  if (data.currency !== undefined) entity.currency = data.currency;
  if (data.metadata !== undefined) entity.metadata = data.metadata;
  entity.updatedAt = new Date().toISOString();
  return entity;
}

export function softDeleteEntity(id) {
  const store = getStore();
  const entity = store.entities.find((e) => e.id === id && !e.deletedAt);
  if (!entity) return null;
  entity.deletedAt = new Date().toISOString();
  return entity;
}

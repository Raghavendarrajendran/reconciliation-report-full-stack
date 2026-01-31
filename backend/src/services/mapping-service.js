import { v4 as uuidv4 } from "uuid";
import { getStore } from "../store/index.js";

export function listPrepaidMappings(entityId = null) {
  const store = getStore();
  let list = store.prepaidMappings.filter((m) => !m.deletedAt);
  if (entityId) list = list.filter((m) => m.entityId === entityId);
  return list;
}

export function listExpenseMappings(entityId = null) {
  const store = getStore();
  let list = store.expenseMappings.filter((m) => !m.deletedAt);
  if (entityId) list = list.filter((m) => m.entityId === entityId);
  return list;
}

export function createPrepaidMapping(data) {
  const store = getStore();
  const id = uuidv4();
  const now = new Date().toISOString();
  const mapping = {
    id,
    entityId: data.entityId ?? null,
    glAccountId: data.glAccountId ?? null,
    code: data.code ?? "",
    name: data.name ?? "",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  store.prepaidMappings.push(mapping);
  return mapping;
}

export function createExpenseMapping(data) {
  const store = getStore();
  const id = uuidv4();
  const now = new Date().toISOString();
  const mapping = {
    id,
    entityId: data.entityId ?? null,
    glAccountId: data.glAccountId ?? null,
    code: data.code ?? "",
    name: data.name ?? "",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  store.expenseMappings.push(mapping);
  return mapping;
}

export function updatePrepaidMapping(id, data) {
  const store = getStore();
  const m = store.prepaidMappings.find((x) => x.id === id && !x.deletedAt);
  if (!m) return null;
  if (data.entityId !== undefined) m.entityId = data.entityId;
  if (data.glAccountId !== undefined) m.glAccountId = data.glAccountId;
  if (data.code !== undefined) m.code = data.code;
  if (data.name !== undefined) m.name = data.name;
  m.updatedAt = new Date().toISOString();
  return m;
}

export function updateExpenseMapping(id, data) {
  const store = getStore();
  const m = store.expenseMappings.find((x) => x.id === id && !x.deletedAt);
  if (!m) return null;
  if (data.entityId !== undefined) m.entityId = data.entityId;
  if (data.glAccountId !== undefined) m.glAccountId = data.glAccountId;
  if (data.code !== undefined) m.code = data.code;
  if (data.name !== undefined) m.name = data.name;
  m.updatedAt = new Date().toISOString();
  return m;
}

export function softDeletePrepaidMapping(id) {
  const store = getStore();
  const m = store.prepaidMappings.find((x) => x.id === id && !x.deletedAt);
  if (!m) return null;
  m.deletedAt = new Date().toISOString();
  return m;
}

export function softDeleteExpenseMapping(id) {
  const store = getStore();
  const m = store.expenseMappings.find((x) => x.id === id && !x.deletedAt);
  if (!m) return null;
  m.deletedAt = new Date().toISOString();
  return m;
}

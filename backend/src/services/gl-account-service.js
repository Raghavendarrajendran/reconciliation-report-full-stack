import { v4 as uuidv4 } from "uuid";
import { getStore } from "../store/index.js";

export function listGlAccounts(entityId = null, includeDeleted = false) {
  const store = getStore();
  let list = store.glAccounts;
  if (entityId) list = list.filter((a) => a.entityId === entityId);
  if (!includeDeleted) list = list.filter((a) => !a.deletedAt);
  return list;
}

export function getGlAccount(id) {
  const store = getStore();
  return store.glAccounts.find((a) => a.id === id && !a.deletedAt) ?? null;
}

export function createGlAccount(data) {
  const store = getStore();
  const id = uuidv4();
  const now = new Date().toISOString();
  const account = {
    id,
    entityId: data.entityId ?? null,
    code: data.code ?? "",
    name: data.name ?? "",
    type: data.type ?? "ASSET",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  store.glAccounts.push(account);
  return account;
}

export function updateGlAccount(id, data) {
  const store = getStore();
  const account = store.glAccounts.find((a) => a.id === id && !a.deletedAt);
  if (!account) return null;
  if (data.code !== undefined) account.code = data.code;
  if (data.name !== undefined) account.name = data.name;
  if (data.type !== undefined) account.type = data.type;
  if (data.entityId !== undefined) account.entityId = data.entityId;
  account.updatedAt = new Date().toISOString();
  return account;
}

export function softDeleteGlAccount(id) {
  const store = getStore();
  const account = store.glAccounts.find((a) => a.id === id && !a.deletedAt);
  if (!account) return null;
  account.deletedAt = new Date().toISOString();
  return account;
}

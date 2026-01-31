import { v4 as uuidv4 } from "uuid";
import { getStore } from "../store/index.js";

export async function createAuditEntry({
  userId,
  action,
  resource,
  resourceId,
  metadata = {},
  before,
  after,
}) {
  const store = getStore();
  const entry = {
    id: uuidv4(),
    userId,
    action,
    resource,
    resourceId: resourceId ?? null,
    metadata: typeof metadata === "object" ? metadata : {},
    before: before ?? null,
    after: after ?? null,
    timestamp: new Date().toISOString(),
  };
  store.auditLogs.push(entry);
  return entry;
}

export function getAuditLogs(filters = {}) {
  const store = getStore();
  let list = [...store.auditLogs].reverse();
  if (filters.userId) list = list.filter((e) => e.userId === filters.userId);
  if (filters.action) list = list.filter((e) => e.action === filters.action);
  if (filters.resource)
    list = list.filter((e) => e.resource === filters.resource);
  if (filters.resourceId)
    list = list.filter((e) => e.resourceId === filters.resourceId);
  if (filters.from) list = list.filter((e) => e.timestamp >= filters.from);
  if (filters.to) list = list.filter((e) => e.timestamp <= filters.to);
  const limit = Math.min(Number(filters.limit) || 100, 500);
  return list.slice(0, limit);
}

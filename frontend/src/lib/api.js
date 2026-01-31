/** Same-origin on Vercel single deploy; set VITE_API_URL when frontend and API are separate. */
const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function getToken() {
  return localStorage.getItem("accessToken");
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: "Bearer " + token }),
    ...options.headers,
  };
  const res = await fetch(API_BASE + path, {
    ...options,
    headers,
    credentials: "include",
  });
  if (res.status === 401) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.dispatchEvent(new Event("auth:logout"));
    throw new Error("Session expired");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const authApi = {
  login: (email, password) =>
    api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (body) =>
    api("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  refresh: (refreshToken) =>
    api("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
  logout: () => api("/auth/logout", { method: "POST" }),
  me: () => api("/auth/me"),
};

export const usersApi = {
  list: () => api("/users"),
  get: (id) => api("/users/" + id),
};

export const entitiesApi = {
  list: (params) =>
    api("/entities?" + new URLSearchParams(params || {}).toString()),
  get: (id) => api("/entities/" + id),
  create: (body) =>
    api("/entities", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    api("/entities/" + id, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id) => api("/entities/" + id, { method: "DELETE" }),
};

export const glAccountsApi = {
  list: (params) =>
    api("/gl-accounts?" + new URLSearchParams(params || {}).toString()),
  get: (id) => api("/gl-accounts/" + id),
  create: (body) =>
    api("/gl-accounts", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    api("/gl-accounts/" + id, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id) => api("/gl-accounts/" + id, { method: "DELETE" }),
};

export const periodsApi = {
  list: (params) =>
    api("/periods?" + new URLSearchParams(params || {}).toString()),
  get: (id) => api("/periods/" + id),
  create: (body) =>
    api("/periods", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    api("/periods/" + id, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id) => api("/periods/" + id, { method: "DELETE" }),
};

export const mappingsApi = {
  listPrepaid: (params) =>
    api("/mappings/prepaid?" + new URLSearchParams(params || {}).toString()),
  listExpense: (params) =>
    api("/mappings/expense?" + new URLSearchParams(params || {}).toString()),
  createPrepaid: (body) =>
    api("/mappings/prepaid", { method: "POST", body: JSON.stringify(body) }),
  createExpense: (body) =>
    api("/mappings/expense", { method: "POST", body: JSON.stringify(body) }),
};

export const uploadsApi = {
  parse: (file) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(API_BASE + "/uploads/parse", {
      method: "POST",
      headers: { Authorization: "Bearer " + getToken() },
      body: form,
      credentials: "include",
    }).then((r) => r.json());
  },
  saveSchedule: (body) =>
    api("/uploads/schedule", { method: "POST", body: JSON.stringify(body) }),
  saveTrialBalance: (body) =>
    api("/uploads/trial-balance", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  saveScheduleFile: (file, { sheetName, entityId, periodId } = {}) => {
    const form = new FormData();
    form.append("file", file);
    if (sheetName) form.append("sheetName", sheetName);
    if (entityId) form.append("entityId", entityId);
    if (periodId) form.append("periodId", periodId);
    return fetch(API_BASE + "/uploads/schedule-file", {
      method: "POST",
      headers: { Authorization: "Bearer " + getToken() },
      body: form,
      credentials: "include",
    }).then((r) =>
      r.ok
        ? r.json()
        : r
            .json()
            .then((d) => Promise.reject(new Error(d.error || r.statusText))),
    );
  },
  saveTrialBalanceFile: (file, { sheetName, entityId, periodId } = {}) => {
    const form = new FormData();
    form.append("file", file);
    if (sheetName) form.append("sheetName", sheetName);
    if (entityId) form.append("entityId", entityId);
    if (periodId) form.append("periodId", periodId);
    return fetch(API_BASE + "/uploads/trial-balance-file", {
      method: "POST",
      headers: { Authorization: "Bearer " + getToken() },
      body: form,
      credentials: "include",
    }).then((r) =>
      r.ok
        ? r.json()
        : r
            .json()
            .then((d) => Promise.reject(new Error(d.error || r.statusText))),
    );
  },
  savePprecFile: (file, { sheetName, entityId, periodId, fiscalYear } = {}) => {
    const form = new FormData();
    form.append("file", file);
    if (sheetName) form.append("sheetName", sheetName);
    if (entityId) form.append("entityId", entityId);
    if (periodId) form.append("periodId", periodId);
    if (fiscalYear != null && fiscalYear !== "")
      form.append("fiscalYear", fiscalYear);
    return fetch(API_BASE + "/uploads/pprec-file", {
      method: "POST",
      headers: { Authorization: "Bearer " + getToken() },
      body: form,
      credentials: "include",
    }).then((r) =>
      r.ok
        ? r.json()
        : r
            .json()
            .then((d) => Promise.reject(new Error(d.error || r.statusText))),
    );
  },
  listSchedule: (params) =>
    api("/uploads/schedule?" + new URLSearchParams(params || {}).toString()),
  getSchedule: (id) => api("/uploads/schedule/" + id),
  listTrialBalance: (params) =>
    api(
      "/uploads/trial-balance?" + new URLSearchParams(params || {}).toString(),
    ),
  getTrialBalance: (id) => api("/uploads/trial-balance/" + id),
  listPprec: (params) =>
    api("/uploads/pprec?" + new URLSearchParams(params || {}).toString()),
  getPprec: (id) => api("/uploads/pprec/" + id),
};

export const reconciliationsApi = {
  list: (params) =>
    api("/reconciliations?" + new URLSearchParams(params || {}).toString()),
  get: (id, withEvidence = false) =>
    api("/reconciliations/" + id + (withEvidence ? "?evidence=true" : "")),
  run: (body) =>
    api("/reconciliations/run", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    api("/reconciliations/" + id, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

export const adjustmentsApi = {
  list: (params) =>
    api("/adjustments?" + new URLSearchParams(params || {}).toString()),
  get: (id) => api("/adjustments/" + id),
  create: (body) =>
    api("/adjustments", { method: "POST", body: JSON.stringify(body) }),
  approve: (id, comment) =>
    api("/adjustments/" + id + "/approve", {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),
  reject: (id, comment) =>
    api("/adjustments/" + id + "/reject", {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),
};

export const dashboardsApi = {
  summary: (params) =>
    api("/dashboards/summary?" + new URLSearchParams(params || {}).toString()),
  listConfigs: () => api("/dashboards/configs"),
  saveConfig: (body) =>
    api("/dashboards/configs", { method: "POST", body: JSON.stringify(body) }),
  updateConfig: (id, body) =>
    api("/dashboards/configs/" + id, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteConfig: (id) => api("/dashboards/configs/" + id, { method: "DELETE" }),
};

export const reportsApi = {
  dynamic: (params) =>
    api("/reports/dynamic?" + new URLSearchParams(params || {}).toString()),
  definitions: () => api("/reports/definitions"),
};

export const auditApi = {
  list: (params) =>
    api("/audit?" + new URLSearchParams(params || {}).toString()),
};

export const settingsApi = {
  get: () => api("/settings"),
  update: (body) =>
    api("/settings", { method: "PATCH", body: JSON.stringify(body) }),
};

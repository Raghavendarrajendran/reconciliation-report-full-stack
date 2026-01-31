/**
 * IndexedDB schema for Prepayment Reconciliation Platform
 * Stores: theme, draft uploads, draft adjustments, dashboard configs (offline-friendly).
 */

import { openDB } from "idb";

const DB_NAME = "reconciliation-platform";
const DB_VERSION = 1;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("preferences")) {
      db.createObjectStore("preferences", { keyPath: "key" });
    }
    if (!db.objectStoreNames.contains("draft_uploads")) {
      const s = db.createObjectStore("draft_uploads", {
        keyPath: "id",
        autoIncrement: true,
      });
      s.createIndex("byEntityPeriod", ["entityId", "periodId"]);
    }
    if (!db.objectStoreNames.contains("draft_adjustments")) {
      db.createObjectStore("draft_adjustments", {
        keyPath: "id",
        autoIncrement: true,
      });
    }
    if (!db.objectStoreNames.contains("dashboard_configs")) {
      db.createObjectStore("dashboard_configs", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("filter_state")) {
      db.createObjectStore("filter_state", { keyPath: "key" });
    }
  },
});

export const db = {
  async getPreference(key) {
    const db = await dbPromise;
    const row = await db.get("preferences", key);
    return row?.value;
  },
  async setPreference(key, value) {
    const db = await dbPromise;
    await db.put("preferences", {
      key,
      value,
      updatedAt: new Date().toISOString(),
    });
  },
  async getDraftUploads(entityId, periodId) {
    const db = await dbPromise;
    const all = await db.getAll("draft_uploads");
    return all.filter(
      (d) =>
        (!entityId || d.entityId === entityId) &&
        (!periodId || d.periodId === periodId),
    );
  },
  async saveDraftUpload(draft) {
    const db = await dbPromise;
    return db.put("draft_uploads", {
      ...draft,
      updatedAt: new Date().toISOString(),
    });
  },
  async deleteDraftUpload(id) {
    const db = await dbPromise;
    await db.delete("draft_uploads", id);
  },
  async getDraftAdjustments() {
    const db = await dbPromise;
    return db.getAll("draft_adjustments");
  },
  async saveDraftAdjustment(draft) {
    const db = await dbPromise;
    return db.put("draft_adjustments", {
      ...draft,
      updatedAt: new Date().toISOString(),
    });
  },
  async deleteDraftAdjustment(id) {
    const db = await dbPromise;
    await db.delete("draft_adjustments", id);
  },
  async getFilterState(key = "global") {
    const db = await dbPromise;
    const row = await db.get("filter_state", key);
    return row?.value ?? {};
  },
  async setFilterState(key, value) {
    const db = await dbPromise;
    await db.put("filter_state", {
      key,
      value: value ?? {},
      updatedAt: new Date().toISOString(),
    });
  },
};

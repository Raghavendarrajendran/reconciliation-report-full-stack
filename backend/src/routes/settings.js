import { Router } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { getStore } from "../store/index.js";

/**
 * User preferences: theme (dark/light/system), global filters (entity, period, etc.).
 * Stored server-side for sync; frontend can also persist in IndexedDB.
 */
const userSettingsStore = new Map(); // userId -> { theme, filters, ... }

export const settingsRouter = Router();
settingsRouter.use(authenticate);

settingsRouter.get("/", (req, res) => {
  const prefs = userSettingsStore.get(req.user.sub) ?? {
    theme: "system",
    filters: {},
  };
  res.json(prefs);
});

settingsRouter.patch(
  "/",
  [
    body("theme").optional().isIn(["dark", "light", "system"]),
    body("filters").optional(),
  ],
  (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const current = userSettingsStore.get(req.user.sub) ?? {
        theme: "system",
        filters: {},
      };
      if (req.body.theme !== undefined) current.theme = req.body.theme;
      if (req.body.filters !== undefined)
        current.filters = { ...current.filters, ...req.body.filters };
      userSettingsStore.set(req.user.sub, current);
      res.json(current);
    } catch (e) {
      next(e);
    }
  },
);

/** Tolerance thresholds (admin). */
const store = getStore();
if (!store.toleranceSettings?.length) {
  store.toleranceSettings = [];
}

settingsRouter.get("/tolerance", (req, res, next) => {
  try {
    const list = (getStore().toleranceSettings || []).filter(
      (t) => !t.deletedAt,
    );
    res.json({ toleranceSettings: list });
  } catch (e) {
    next(e);
  }
});

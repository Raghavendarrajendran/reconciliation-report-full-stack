import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { ROLES } from "../config/constants.js";
import { getStore } from "../store/index.js";
import { createAuditEntry } from "../services/audit-service.js";

export const reportsRouter = Router();
reportsRouter.use(authenticate);

/**
 * Dynamic report: filter reconciliations (or adjustments) and return rows.
 * Query params: entityId, periodId, status, dataset (reconciliations | adjustments).
 */
reportsRouter.get("/dynamic", async (req, res, next) => {
  try {
    const store = getStore();
    const dataset = req.query.dataset || "reconciliations";
    const entityId = req.query.entityId ?? null;
    const periodId = req.query.periodId ?? null;
    const status = req.query.status ?? null;

    if (
      req.user.role !== ROLES.APP_ADMINISTRATOR &&
      req.user.role !== ROLES.ADMIN &&
      req.user.entityIds?.length
    ) {
      if (entityId && !req.user.entityIds.includes(entityId))
        return res.status(403).json({ error: "Access denied" });
    }

    if (dataset === "adjustments") {
      let list = store.adjustmentEntries.filter((a) => !a.deletedAt);
      if (entityId) list = list.filter((a) => a.entityId === entityId);
      if (periodId) list = list.filter((a) => a.periodId === periodId);
      if (status) list = list.filter((a) => a.status === status);
      if (
        req.user.role !== ROLES.APP_ADMINISTRATOR &&
        req.user.role !== ROLES.ADMIN &&
        req.user.entityIds?.length
      ) {
        list = list.filter((a) => req.user.entityIds.includes(a.entityId));
      }
      return res.json({ rows: list, dataset: "adjustments" });
    }

    let list = store.reconciliations.filter((r) => !r.deletedAt);
    if (entityId) list = list.filter((r) => r.entityId === entityId);
    if (periodId) list = list.filter((r) => r.periodId === periodId);
    if (status) list = list.filter((r) => r.status === status);
    if (
      req.user.role !== ROLES.APP_ADMINISTRATOR &&
      req.user.role !== ROLES.ADMIN &&
      req.user.entityIds?.length
    ) {
      list = list.filter((r) => req.user.entityIds.includes(r.entityId));
    }
    res.json({ rows: list, dataset: "reconciliations" });
  } catch (e) {
    next(e);
  }
});

/** Save report definition (no-code builder). */
reportsRouter.post(
  "/definitions",
  requireRoles(
    ROLES.APP_ADMINISTRATOR,
    ROLES.ADMIN,
    ROLES.ENTITY_USER,
    ROLES.MAKER,
    ROLES.CHECKER,
    ROLES.AUDITOR,
  ),
  [
    body("name").trim().notEmpty(),
    body("dataset").isIn(["reconciliations", "adjustments", "schedule", "tb"]),
    body("columns").isArray(),
    body("filters").optional().isObject(),
    body("groupBy").optional().isArray(),
    body("aggregations").optional().isArray(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const store = getStore();
      const id = uuidv4();
      const now = new Date().toISOString();
      const def = {
        id,
        userId: req.user.sub,
        name: req.body.name,
        dataset: req.body.dataset,
        columns: req.body.columns,
        filters: req.body.filters ?? {},
        groupBy: req.body.groupBy ?? [],
        aggregations: req.body.aggregations ?? [],
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      store.reportDefinitions.push(def);
      res.status(201).json(def);
    } catch (e) {
      next(e);
    }
  },
);

reportsRouter.get("/definitions", async (req, res, next) => {
  try {
    const store = getStore();
    const list = store.reportDefinitions.filter(
      (r) => !r.deletedAt && r.userId === req.user.sub,
    );
    res.json({ definitions: list });
  } catch (e) {
    next(e);
  }
});

/** Export trigger – audit only (actual Excel/PDF can be generated on frontend from /reports/dynamic). */
reportsRouter.post("/export", async (req, res, next) => {
  try {
    await createAuditEntry({
      userId: req.user.sub,
      action: "REPORT_EXPORT",
      resource: "report",
      metadata: req.body ?? {},
    });
    res.json({ message: "Export logged" });
  } catch (e) {
    next(e);
  }
});

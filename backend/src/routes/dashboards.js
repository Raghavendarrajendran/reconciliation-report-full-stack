import { Router } from "express";
import { body, validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import { authenticate } from "../middleware/auth.js";
import { ROLES } from "../config/constants.js";
import { getStore } from "../store/index.js";

export const dashboardsRouter = Router();
dashboardsRouter.use(authenticate);

/**
 * GET /api/dashboards/reconciliation-table
 * Returns reconciliation table for dashboard: one row per account per entity, with columns
 * Begin in 2021..2025 Prepaid, Total Subsystem, GL Balance, Difference, Recon Entries, Final Difference, Status.
 * Optional: entityId, periodId. Section totals per entity.
 */
dashboardsRouter.get("/reconciliation-table", async (req, res, next) => {
  try {
    const store = getStore();
    const entityId = req.query.entityId ?? null;
    const periodId = req.query.periodId ?? null;
    let recs = store.reconciliations.filter((r) => !r.deletedAt);
    if (entityId) recs = recs.filter((r) => r.entityId === entityId);
    if (periodId) recs = recs.filter((r) => r.periodId === periodId);
    if (
      req.user.role !== ROLES.APP_ADMINISTRATOR &&
      req.user.role !== ROLES.ADMIN &&
      req.user.entityIds?.length
    ) {
      recs = recs.filter((r) => req.user.entityIds.includes(r.entityId));
    }
    const byEntity = {};
    for (const r of recs) {
      const eid = r.entityId ?? "_";
      if (!byEntity[eid]) {
        byEntity[eid] = { rows: [], totals: null };
      }
      byEntity[eid].rows.push({
        id: r.id,
        prepaidAccount: r.prepaidAccount ?? r.prepaidAccountId,
        beginIn2021Prepaid: r.beginIn2021Prepaid ?? 0,
        beginIn2022Prepaid: r.beginIn2022Prepaid ?? 0,
        beginIn2023Prepaid: r.beginIn2023Prepaid ?? 0,
        beginIn2024Prepaid: r.beginIn2024Prepaid ?? 0,
        beginIn2025Prepaid: r.beginIn2025Prepaid ?? 0,
        totalSubsystem: r.totalSubsystem ?? 0,
        glBalance: r.glBalance ?? r.actualClosing ?? null,
        difference: r.difference ?? null,
        reconEntries: r.reconEntries ?? 0,
        finalDifference: r.finalDifference ?? null,
        status: r.status ?? "OPEN",
        periodId: r.periodId,
        fiscalYear: r.fiscalYear,
      });
    }
    for (const eid of Object.keys(byEntity)) {
      const rows = byEntity[eid].rows;
      byEntity[eid].totals = {
        beginIn2021Prepaid: rows.reduce(
          (s, r) => s + (r.beginIn2021Prepaid ?? 0),
          0,
        ),
        beginIn2022Prepaid: rows.reduce(
          (s, r) => s + (r.beginIn2022Prepaid ?? 0),
          0,
        ),
        beginIn2023Prepaid: rows.reduce(
          (s, r) => s + (r.beginIn2023Prepaid ?? 0),
          0,
        ),
        beginIn2024Prepaid: rows.reduce(
          (s, r) => s + (r.beginIn2024Prepaid ?? 0),
          0,
        ),
        beginIn2025Prepaid: rows.reduce(
          (s, r) => s + (r.beginIn2025Prepaid ?? 0),
          0,
        ),
        totalSubsystem: rows.reduce((s, r) => s + (r.totalSubsystem ?? 0), 0),
        glBalance: rows.reduce((s, r) => s + (Number(r.glBalance) || 0), 0),
        difference: rows.reduce((s, r) => s + (Number(r.difference) || 0), 0),
        reconEntries: rows.reduce((s, r) => s + (r.reconEntries ?? 0), 0),
        finalDifference: rows.reduce(
          (s, r) => s + (Number(r.finalDifference) || 0),
          0,
        ),
      };
    }
    res.json({
      entityId,
      periodId,
      byEntity,
      entities: Object.keys(byEntity).filter((k) => k !== "_"),
    });
  } catch (e) {
    next(e);
  }
});

dashboardsRouter.get("/summary", async (req, res, next) => {
  try {
    const store = getStore();
    const entityId = req.query.entityId ?? null;
    const periodId = req.query.periodId ?? null;
    let recs = store.reconciliations.filter((r) => !r.deletedAt);
    if (entityId) recs = recs.filter((r) => r.entityId === entityId);
    if (periodId) recs = recs.filter((r) => r.periodId === periodId);
    if (
      req.user.role !== ROLES.APP_ADMINISTRATOR &&
      req.user.role !== ROLES.ADMIN &&
      req.user.entityIds?.length
    ) {
      recs = recs.filter((r) => req.user.entityIds.includes(r.entityId));
    }
    const byStatus = {};
    let varianceTotalOpen = 0;
    let varianceTotalClosed = 0;
    const byEntity = {};
    const byPeriod = {};
    recs.forEach((r) => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      const v = Number(r.variance) || 0;
      if (
        r.status === "OPEN" ||
        r.status === "REOPENED" ||
        r.status === "PENDING_CHECKER"
      ) {
        varianceTotalOpen += v;
      } else {
        varianceTotalClosed += v;
      }
      const eid = r.entityId ?? "_";
      byEntity[eid] = (byEntity[eid] || 0) + 1;
      const pid = r.periodId ?? "_";
      byPeriod[pid] = (byPeriod[pid] || 0) + 1;
    });
    const pendingApprovals = store.adjustmentEntries.filter(
      (a) => !a.deletedAt && a.status === "PENDING_APPROVAL",
    ).length;
    res.json({
      byStatus,
      total: recs.length,
      pendingApprovals,
      varianceTotals: {
        openSum: varianceTotalOpen,
        closedSum: varianceTotalClosed,
      },
      byEntity,
      byPeriod,
      entityId,
      periodId,
    });
  } catch (e) {
    next(e);
  }
});

dashboardsRouter.get("/configs", async (req, res, next) => {
  try {
    const store = getStore();
    const list = store.dashboardConfigs.filter(
      (c) => !c.deletedAt && c.userId === req.user.sub,
    );
    res.json({ configs: list });
  } catch (e) {
    next(e);
  }
});

dashboardsRouter.post(
  "/configs",
  [body("name").trim().notEmpty(), body("widgets").isArray()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const store = getStore();
      const id = uuidv4();
      const now = new Date().toISOString();
      const config = {
        id,
        userId: req.user.sub,
        name: req.body.name,
        widgets: req.body.widgets,
        filters: req.body.filters ?? {},
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      store.dashboardConfigs.push(config);
      res.status(201).json(config);
    } catch (e) {
      next(e);
    }
  },
);

dashboardsRouter.patch(
  "/configs/:id",
  [body("name").optional().trim(), body("widgets").optional().isArray()],
  async (req, res, next) => {
    try {
      const store = getStore();
      const config = store.dashboardConfigs.find(
        (c) =>
          c.id === req.params.id && c.userId === req.user.sub && !c.deletedAt,
      );
      if (!config) return res.status(404).json({ error: "Config not found" });
      if (req.body.name !== undefined) config.name = req.body.name;
      if (req.body.widgets !== undefined) config.widgets = req.body.widgets;
      if (req.body.filters !== undefined) config.filters = req.body.filters;
      config.updatedAt = new Date().toISOString();
      res.json(config);
    } catch (e) {
      next(e);
    }
  },
);

dashboardsRouter.delete("/configs/:id", async (req, res, next) => {
  try {
    const store = getStore();
    const config = store.dashboardConfigs.find(
      (c) =>
        c.id === req.params.id && c.userId === req.user.sub && !c.deletedAt,
    );
    if (!config) return res.status(404).json({ error: "Config not found" });
    config.deletedAt = new Date().toISOString();
    res.json({ message: "Deleted" });
  } catch (e) {
    next(e);
  }
});

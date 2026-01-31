import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { ROLES } from "../config/constants.js";
import * as periodService from "../services/period-service.js";
import { createAuditEntry } from "../services/audit-service.js";

export const periodsRouter = Router();
periodsRouter.use(authenticate);

function canAccessEntity(user, entityId) {
  if (!entityId) return true;
  if (user.role === ROLES.APP_ADMINISTRATOR || user.role === ROLES.ADMIN)
    return true;
  return (user.entityIds ?? []).includes(entityId);
}

periodsRouter.get("/", async (req, res, next) => {
  try {
    const entityId = req.query.entityId ?? null;
    if (entityId && !canAccessEntity(req.user, entityId))
      return res.status(403).json({ error: "Access denied" });
    const list = periodService.listPeriods(entityId);
    res.json({ periods: list });
  } catch (e) {
    next(e);
  }
});

periodsRouter.get("/:id", async (req, res, next) => {
  try {
    const period = periodService.getPeriod(req.params.id);
    if (!period) return res.status(404).json({ error: "Period not found" });
    if (period.entityId && !canAccessEntity(req.user, period.entityId))
      return res.status(403).json({ error: "Access denied" });
    res.json(period);
  } catch (e) {
    next(e);
  }
});

periodsRouter.post(
  "/",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  [
    body("entityId").optional(),
    body("code").trim().notEmpty(),
    body("name").trim().notEmpty(),
    body("startDate").notEmpty(),
    body("endDate").notEmpty(),
    body("isClosed").optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const period = periodService.createPeriod(req.body);
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "fiscal_period",
        resourceId: period.id,
        metadata: { op: "create" },
      });
      res.status(201).json(period);
    } catch (e) {
      next(e);
    }
  },
);

periodsRouter.patch(
  "/:id",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  [
    body("code").optional().trim(),
    body("name").optional().trim(),
    body("startDate").optional(),
    body("endDate").optional(),
    body("isClosed").optional().isBoolean(),
    body("entityId").optional(),
  ],
  async (req, res, next) => {
    try {
      const period = periodService.updatePeriod(req.params.id, req.body);
      if (!period) return res.status(404).json({ error: "Period not found" });
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "fiscal_period",
        resourceId: period.id,
        metadata: { op: "update" },
      });
      res.json(period);
    } catch (e) {
      next(e);
    }
  },
);

periodsRouter.delete(
  "/:id",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const period = periodService.softDeletePeriod(req.params.id);
      if (!period) return res.status(404).json({ error: "Period not found" });
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "fiscal_period",
        resourceId: period.id,
        metadata: { op: "soft_delete" },
      });
      res.json({ message: "Period deactivated" });
    } catch (e) {
      next(e);
    }
  },
);

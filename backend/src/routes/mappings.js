import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { ROLES } from "../config/constants.js";
import * as mappingService from "../services/mapping-service.js";
import { createAuditEntry } from "../services/audit-service.js";

export const mappingsRouter = Router();
mappingsRouter.use(authenticate);

function canAccessEntity(user, entityId) {
  if (!entityId) return true;
  if (user.role === ROLES.APP_ADMINISTRATOR || user.role === ROLES.ADMIN)
    return true;
  return (user.entityIds ?? []).includes(entityId);
}

mappingsRouter.get("/prepaid", async (req, res, next) => {
  try {
    const entityId = req.query.entityId ?? null;
    if (entityId && !canAccessEntity(req.user, entityId))
      return res.status(403).json({ error: "Access denied" });
    const list = mappingService.listPrepaidMappings(entityId);
    res.json({ mappings: list });
  } catch (e) {
    next(e);
  }
});

mappingsRouter.get("/expense", async (req, res, next) => {
  try {
    const entityId = req.query.entityId ?? null;
    if (entityId && !canAccessEntity(req.user, entityId))
      return res.status(403).json({ error: "Access denied" });
    const list = mappingService.listExpenseMappings(entityId);
    res.json({ mappings: list });
  } catch (e) {
    next(e);
  }
});

mappingsRouter.post(
  "/prepaid",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  [
    body("entityId").optional(),
    body("glAccountId").optional(),
    body("code").optional().trim(),
    body("name").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const mapping = mappingService.createPrepaidMapping(req.body);
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "prepaid_mapping",
        resourceId: mapping.id,
        metadata: { op: "create" },
      });
      res.status(201).json(mapping);
    } catch (e) {
      next(e);
    }
  },
);

mappingsRouter.post(
  "/expense",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  [
    body("entityId").optional(),
    body("glAccountId").optional(),
    body("code").optional().trim(),
    body("name").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const mapping = mappingService.createExpenseMapping(req.body);
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "expense_mapping",
        resourceId: mapping.id,
        metadata: { op: "create" },
      });
      res.status(201).json(mapping);
    } catch (e) {
      next(e);
    }
  },
);

mappingsRouter.patch(
  "/prepaid/:id",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  [
    body("entityId").optional(),
    body("glAccountId").optional(),
    body("code").optional().trim(),
    body("name").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const mapping = mappingService.updatePrepaidMapping(
        req.params.id,
        req.body,
      );
      if (!mapping) return res.status(404).json({ error: "Mapping not found" });
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "prepaid_mapping",
        resourceId: mapping.id,
        metadata: { op: "update" },
      });
      res.json(mapping);
    } catch (e) {
      next(e);
    }
  },
);

mappingsRouter.patch(
  "/expense/:id",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  [
    body("entityId").optional(),
    body("glAccountId").optional(),
    body("code").optional().trim(),
    body("name").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const mapping = mappingService.updateExpenseMapping(
        req.params.id,
        req.body,
      );
      if (!mapping) return res.status(404).json({ error: "Mapping not found" });
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "expense_mapping",
        resourceId: mapping.id,
        metadata: { op: "update" },
      });
      res.json(mapping);
    } catch (e) {
      next(e);
    }
  },
);

mappingsRouter.delete(
  "/prepaid/:id",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const mapping = mappingService.softDeletePrepaidMapping(req.params.id);
      if (!mapping) return res.status(404).json({ error: "Mapping not found" });
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "prepaid_mapping",
        resourceId: mapping.id,
        metadata: { op: "soft_delete" },
      });
      res.json({ message: "Mapping deactivated" });
    } catch (e) {
      next(e);
    }
  },
);

mappingsRouter.delete(
  "/expense/:id",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const mapping = mappingService.softDeleteExpenseMapping(req.params.id);
      if (!mapping) return res.status(404).json({ error: "Mapping not found" });
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "expense_mapping",
        resourceId: mapping.id,
        metadata: { op: "soft_delete" },
      });
      res.json({ message: "Mapping deactivated" });
    } catch (e) {
      next(e);
    }
  },
);

import { Router } from "express";
import { body, validationResult } from "express-validator";
import {
  authenticate,
  requireRoles,
  requireEntityAccess,
} from "../middleware/auth.js";
import { ROLES } from "../config/constants.js";
import * as entityService from "../services/entity-service.js";
import { createAuditEntry } from "../services/audit-service.js";

export const entitiesRouter = Router();
entitiesRouter.use(authenticate);

entitiesRouter.get("/", async (req, res, next) => {
  try {
    const list = entityService.listEntities();
    const entityIds = req.user?.entityIds;
    const role = req.user?.role;
    let filtered = list;
    if (
      role &&
      role !== ROLES.APP_ADMINISTRATOR &&
      role !== ROLES.ADMIN &&
      entityIds?.length
    ) {
      filtered = list.filter((e) => entityIds.includes(e.id));
    }
    res.json({ entities: filtered });
  } catch (e) {
    next(e);
  }
});

entitiesRouter.get("/:id", async (req, res, next) => {
  try {
    const entity = entityService.getEntity(req.params.id);
    if (!entity) return res.status(404).json({ error: "Entity not found" });
    if (
      req.user.role !== ROLES.APP_ADMINISTRATOR &&
      req.user.role !== ROLES.ADMIN
    ) {
      if (!(req.user.entityIds ?? []).includes(entity.id))
        return res.status(403).json({ error: "Access denied" });
    }
    res.json(entity);
  } catch (e) {
    next(e);
  }
});

entitiesRouter.post(
  "/",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  [
    body("code").trim().notEmpty(),
    body("name").trim().notEmpty(),
    body("currency").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const entity = entityService.createEntity(req.body);
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "entity",
        resourceId: entity.id,
        metadata: { op: "create", code: entity.code },
      });
      res.status(201).json(entity);
    } catch (e) {
      next(e);
    }
  },
);

entitiesRouter.patch(
  "/:id",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  [
    body("code").optional().trim(),
    body("name").optional().trim(),
    body("currency").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const entity = entityService.updateEntity(req.params.id, req.body);
      if (!entity) return res.status(404).json({ error: "Entity not found" });
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "entity",
        resourceId: entity.id,
        metadata: { op: "update" },
      });
      res.json(entity);
    } catch (e) {
      next(e);
    }
  },
);

entitiesRouter.delete(
  "/:id",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const entity = entityService.softDeleteEntity(req.params.id);
      if (!entity) return res.status(404).json({ error: "Entity not found" });
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "entity",
        resourceId: entity.id,
        metadata: { op: "soft_delete" },
      });
      res.json({ message: "Entity deactivated" });
    } catch (e) {
      next(e);
    }
  },
);

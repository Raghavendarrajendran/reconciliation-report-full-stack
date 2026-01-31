import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { ROLES } from "../config/constants.js";
import * as glAccountService from "../services/gl-account-service.js";
import { createAuditEntry } from "../services/audit-service.js";

export const glAccountsRouter = Router();
glAccountsRouter.use(authenticate);

function canAccessEntity(user, entityId) {
  if (user.role === ROLES.APP_ADMINISTRATOR || user.role === ROLES.ADMIN)
    return true;
  return (user.entityIds ?? []).includes(entityId);
}

glAccountsRouter.get("/", async (req, res, next) => {
  try {
    const entityId = req.query.entityId ?? null;
    if (entityId && !canAccessEntity(req.user, entityId))
      return res.status(403).json({ error: "Access denied" });
    const list = glAccountService.listGlAccounts(entityId);
    res.json({ glAccounts: list });
  } catch (e) {
    next(e);
  }
});

glAccountsRouter.get("/:id", async (req, res, next) => {
  try {
    const account = glAccountService.getGlAccount(req.params.id);
    if (!account)
      return res.status(404).json({ error: "GL Account not found" });
    if (account.entityId && !canAccessEntity(req.user, account.entityId))
      return res.status(403).json({ error: "Access denied" });
    res.json(account);
  } catch (e) {
    next(e);
  }
});

glAccountsRouter.post(
  "/",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  [
    body("entityId").optional(),
    body("code").trim().notEmpty(),
    body("name").trim().notEmpty(),
    body("type").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const account = glAccountService.createGlAccount(req.body);
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "gl_account",
        resourceId: account.id,
        metadata: { op: "create" },
      });
      res.status(201).json(account);
    } catch (e) {
      next(e);
    }
  },
);

glAccountsRouter.patch(
  "/:id",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  [
    body("code").optional().trim(),
    body("name").optional().trim(),
    body("type").optional().trim(),
    body("entityId").optional(),
  ],
  async (req, res, next) => {
    try {
      const account = glAccountService.updateGlAccount(req.params.id, req.body);
      if (!account)
        return res.status(404).json({ error: "GL Account not found" });
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "gl_account",
        resourceId: account.id,
        metadata: { op: "update" },
      });
      res.json(account);
    } catch (e) {
      next(e);
    }
  },
);

glAccountsRouter.delete(
  "/:id",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const account = glAccountService.softDeleteGlAccount(req.params.id);
      if (!account)
        return res.status(404).json({ error: "GL Account not found" });
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "gl_account",
        resourceId: account.id,
        metadata: { op: "soft_delete" },
      });
      res.json({ message: "GL Account deactivated" });
    } catch (e) {
      next(e);
    }
  },
);

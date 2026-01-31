import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { ROLES } from "../config/constants.js";
import { getStore } from "../store/index.js";
import * as authService from "../services/auth-service.js";
import { createAuditEntry } from "../services/audit-service.js";
import { v4 as uuidv4 } from "uuid";

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get(
  "/",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const store = getStore();
      const list = store.users
        .filter((u) => !u.deletedAt)
        .map(({ passwordHash, ...u }) => u);
      res.json({ users: list });
    } catch (e) {
      next(e);
    }
  },
);

usersRouter.get(
  "/:id",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const store = getStore();
      const user = store.users.find(
        (u) => u.id === req.params.id && !u.deletedAt,
      );
      if (!user) return res.status(404).json({ error: "User not found" });
      const { passwordHash, ...safe } = user;
      res.json(safe);
    } catch (e) {
      next(e);
    }
  },
);

usersRouter.post(
  "/",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
    body("name").optional().trim(),
    body("role").isIn(Object.values(ROLES)),
    body("entityIds").optional().isArray(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const result = await authService.registerUser(req.body);
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "user",
        resourceId: result.id,
        metadata: { op: "create", email: result.email },
      });
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  },
);

usersRouter.patch(
  "/:id",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  [
    body("name").optional().trim(),
    body("role").optional().isIn(Object.values(ROLES)),
    body("entityIds").optional().isArray(),
    body("password").optional().isLength({ min: 8 }),
  ],
  async (req, res, next) => {
    try {
      const store = getStore();
      const user = store.users.find(
        (u) => u.id === req.params.id && !u.deletedAt,
      );
      if (!user) return res.status(404).json({ error: "User not found" });
      if (req.body.name !== undefined) user.name = req.body.name;
      if (req.body.role !== undefined) user.role = req.body.role;
      if (req.body.entityIds !== undefined) user.entityIds = req.body.entityIds;
      if (req.body.password)
        user.passwordHash = await authService.hashPassword(req.body.password);
      user.updatedAt = new Date().toISOString();
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "user",
        resourceId: user.id,
        metadata: { op: "update" },
      });
      const { passwordHash, ...safe } = user;
      res.json(safe);
    } catch (e) {
      next(e);
    }
  },
);

usersRouter.delete(
  "/:id",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const store = getStore();
      const user = store.users.find(
        (u) => u.id === req.params.id && !u.deletedAt,
      );
      if (!user) return res.status(404).json({ error: "User not found" });
      user.deletedAt = new Date().toISOString();
      await createAuditEntry({
        userId: req.user.sub,
        action: "MASTER_CRUD",
        resource: "user",
        resourceId: user.id,
        metadata: { op: "soft_delete" },
      });
      res.json({ message: "User deactivated" });
    } catch (e) {
      next(e);
    }
  },
);

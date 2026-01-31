import { Router } from "express";
import { query, validationResult } from "express-validator";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { ROLES } from "../config/constants.js";
import { getAuditLogs } from "../services/audit-service.js";

export const auditRouter = Router();
auditRouter.use(authenticate);

auditRouter.get(
  "/",
  requireRoles(ROLES.APP_ADMINISTRATOR, ROLES.ADMIN, ROLES.AUDITOR),
  [
    query("userId").optional(),
    query("action").optional(),
    query("resource").optional(),
    query("resourceId").optional(),
    query("from").optional(),
    query("to").optional(),
    query("limit").optional().isInt({ min: 1, max: 500 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const filters = {
        userId: req.query.userId ?? null,
        action: req.query.action ?? null,
        resource: req.query.resource ?? null,
        resourceId: req.query.resourceId ?? null,
        from: req.query.from ?? null,
        to: req.query.to ?? null,
        limit: req.query.limit ?? 100,
      };
      const list = getAuditLogs(filters);
      res.json({ auditLogs: list });
    } catch (e) {
      next(e);
    }
  },
);

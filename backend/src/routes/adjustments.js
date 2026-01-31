import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { ROLES } from "../config/constants.js";
import * as adjustmentService from "../services/adjustment-service.js";
import { createAuditEntry } from "../services/audit-service.js";

export const adjustmentsRouter = Router();
adjustmentsRouter.use(authenticate);

adjustmentsRouter.get("/", async (req, res, next) => {
  try {
    const filters = {
      reconciliationId: req.query.reconciliationId ?? null,
      entityId: req.query.entityId ?? null,
      status: req.query.status ?? null,
      makerId: req.query.makerId ?? null,
    };
    const list = adjustmentService.listAdjustments(filters, req.user);
    res.json({ adjustments: list });
  } catch (e) {
    next(e);
  }
});

adjustmentsRouter.get("/:id", async (req, res, next) => {
  try {
    const adj = adjustmentService.getAdjustment(req.params.id, req.user);
    if (!adj) return res.status(404).json({ error: "Adjustment not found" });
    res.json(adj);
  } catch (e) {
    next(e);
  }
});

/** Maker proposes adjustment. (debitAccount, creditAccount, amount) or legacy (debitAmount, creditAmount). */
adjustmentsRouter.post(
  "/",
  requireRoles(
    ROLES.MAKER,
    ROLES.ADMIN,
    ROLES.APP_ADMINISTRATOR,
    ROLES.ENTITY_USER,
  ),
  [
    body("reconciliationId").notEmpty(),
    body("entityId").optional(),
    body("periodId").optional(),
    body("debitAccount").optional(),
    body("creditAccount").optional(),
    body("amount").optional().isFloat({ min: 0 }),
    body("debitAmount").optional().isFloat({ min: 0 }),
    body("creditAmount").optional().isFloat({ min: 0 }),
    body("explanation").trim().notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const hasAmount = req.body.amount != null && req.body.amount > 0;
      const hasDebitCredit =
        req.body.debitAmount != null || req.body.creditAmount != null;
      if (!hasAmount && !hasDebitCredit)
        return res
          .status(400)
          .json({ error: "Provide amount or debitAmount/creditAmount" });
      const entry = adjustmentService.proposeAdjustment(req.body, req.user.sub);
      await createAuditEntry({
        userId: req.user.sub,
        action: "ADJUSTMENT_PROPOSE",
        resource: "adjustment",
        resourceId: entry.id,
        metadata: { reconciliationId: entry.reconciliationId },
      });
      res.status(201).json(entry);
    } catch (e) {
      next(e);
    }
  },
);

/** Checker approves. */
adjustmentsRouter.post(
  "/:id/approve",
  requireRoles(ROLES.CHECKER, ROLES.ADMIN, ROLES.APP_ADMINISTRATOR),
  [body("comment").optional().trim()],
  async (req, res, next) => {
    try {
      const adj = adjustmentService.approveAdjustment(
        req.params.id,
        req.user.sub,
        req.body.comment,
      );
      await createAuditEntry({
        userId: req.user.sub,
        action: "ADJUSTMENT_APPROVE",
        resource: "adjustment",
        resourceId: adj.id,
        metadata: {},
      });
      res.json(adj);
    } catch (e) {
      next(e);
    }
  },
);

/** Checker rejects (comment mandatory). */
adjustmentsRouter.post(
  "/:id/reject",
  requireRoles(ROLES.CHECKER, ROLES.ADMIN, ROLES.APP_ADMINISTRATOR),
  [body("comment").trim().notEmpty()],
  async (req, res, next) => {
    try {
      const adj = adjustmentService.rejectAdjustment(
        req.params.id,
        req.user.sub,
        req.body.comment,
      );
      await createAuditEntry({
        userId: req.user.sub,
        action: "ADJUSTMENT_REJECT",
        resource: "adjustment",
        resourceId: adj.id,
        metadata: {},
      });
      res.json(adj);
    } catch (e) {
      next(e);
    }
  },
);

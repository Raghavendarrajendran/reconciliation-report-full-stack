import { Router } from "express";
import { body, query, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import * as reconciliationService from "../services/reconciliation-service.js";
import { RECONCILIATION_STATUS } from "../config/constants.js";
import { getStore } from "../store/index.js";

export const reconciliationsRouter = Router();
reconciliationsRouter.use(authenticate);

reconciliationsRouter.get("/", async (req, res, next) => {
  try {
    const filters = {
      entityId: req.query.entityId ?? null,
      periodId: req.query.periodId ?? null,
      fiscalYear: req.query.fiscalYear ?? null,
      status: req.query.status ?? null,
      prepaidAccountId: req.query.prepaidAccountId ?? null,
      prepaidAccount: req.query.prepaidAccount ?? null,
    };
    const list = reconciliationService.listReconciliations(filters, req.user);
    res.json({ reconciliations: list });
  } catch (e) {
    next(e);
  }
});

reconciliationsRouter.get("/:id", async (req, res, next) => {
  try {
    const withEvidence =
      req.query.evidence === "1" || req.query.evidence === "true";
    const rec = withEvidence
      ? reconciliationService.getReconciliationWithEvidence(
          req.params.id,
          req.user,
        )
      : reconciliationService.getReconciliation(req.params.id, req.user);
    if (!rec)
      return res.status(404).json({ error: "Reconciliation not found" });
    res.json(rec);
  } catch (e) {
    next(e);
  }
});

/** POST /api/reconciliations/run – run engine for entity/period (uses normalized schedule_lines, tb_lines, pprec_lines). */
reconciliationsRouter.post(
  "/run",
  [
    body("entityId").notEmpty(),
    body("periodId").notEmpty(),
    body("fiscalYear").optional(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const { entityId, periodId, fiscalYear } = req.body;
      const results = reconciliationService.runReconciliations(
        entityId,
        fiscalYear ?? null,
        periodId,
        req.user,
      );
      res.json({ reconciliations: results });
    } catch (e) {
      next(e);
    }
  },
);

/** PATCH status (e.g. reopen with reason) – optional workflow. */
reconciliationsRouter.patch(
  "/:id",
  [
    body("status").optional().isIn(Object.values(RECONCILIATION_STATUS)),
    body("reason").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const rec = reconciliationService.getReconciliation(
        req.params.id,
        req.user,
      );
      if (!rec)
        return res.status(404).json({ error: "Reconciliation not found" });
      const store = getStore();
      const row = store.reconciliations.find((r) => r.id === req.params.id);
      if (req.body.status) row.status = req.body.status;
      row.updatedAt = new Date().toISOString();
      res.json(row);
    } catch (e) {
      next(e);
    }
  },
);

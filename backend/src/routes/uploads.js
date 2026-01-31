import { Router } from "express";
import multer from "multer";
import { body, query, validationResult } from "express-validator";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { ROLES } from "../config/constants.js";
import * as uploadService from "../services/upload-service.js";
import { createAuditEntry } from "../services/audit-service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadsRouter = Router();
uploadsRouter.use(authenticate);

function canAccessEntity(user, entityId) {
  if (!entityId) return true;
  if (user.role === ROLES.APP_ADMINISTRATOR || user.role === ROLES.ADMIN)
    return true;
  return (user.entityIds ?? []).includes(entityId);
}

/** POST /api/uploads/parse – parse Excel only (for column mapping UI). */
uploadsRouter.post("/parse", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file?.buffer)
      return res.status(400).json({ error: "No file uploaded" });
    const { sheets, rowsBySheet } = uploadService.parseExcel(req.file.buffer);
    const sample = {};
    for (const name of sheets) {
      const rows = rowsBySheet[name] || [];
      const first = rows[0];
      sample[name] = {
        headers: first
          ? Object.keys(uploadService.normalizeHeaders(first))
          : [],
        rowCount: rows.length,
        sampleRows: rows
          .slice(0, 20)
          .map((r) => uploadService.normalizeHeaders(r)),
      };
    }
    res.json({ sheets, sample });
  } catch (e) {
    next(e);
  }
});

/** POST /api/uploads/schedule-file – upload file + sheetName, parse full sheet and save. */
uploadsRouter.post(
  "/schedule-file",
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file?.buffer)
        return res.status(400).json({ error: "No file uploaded" });
      const sheetName = req.body.sheetName || req.body.sheet;
      const entityId = req.body.entityId || undefined;
      const periodId = req.body.periodId || undefined;
      if (entityId && !canAccessEntity(req.user, entityId))
        return res.status(403).json({ error: "Access denied" });
      const rows = uploadService.parseExcelSheet(req.file.buffer, sheetName);
      const record = uploadService.savePrepaymentSchedule({
        entityId,
        periodId,
        rows,
        version: 1,
        uploadedBy: req.user.sub,
      });
      await createAuditEntry({
        userId: req.user.sub,
        action: "UPLOAD_SCHEDULE",
        resource: "prepayment_schedule",
        resourceId: record.id,
        metadata: { entityId, periodId, rowCount: rows.length, sheetName },
      });
      res.status(201).json(record);
    } catch (e) {
      next(e);
    }
  },
);

/** POST /api/uploads/trial-balance-file – upload file + sheetName, parse full sheet and save. */
uploadsRouter.post(
  "/trial-balance-file",
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file?.buffer)
        return res.status(400).json({ error: "No file uploaded" });
      const sheetName = req.body.sheetName || req.body.sheet;
      const entityId = req.body.entityId || undefined;
      const periodId = req.body.periodId || undefined;
      if (entityId && !canAccessEntity(req.user, entityId))
        return res.status(403).json({ error: "Access denied" });
      const rows = uploadService.parseExcelSheet(req.file.buffer, sheetName);
      const record = uploadService.saveTrialBalance({
        entityId,
        periodId,
        rows,
        version: 1,
        uploadedBy: req.user.sub,
      });
      await createAuditEntry({
        userId: req.user.sub,
        action: "UPLOAD_TB",
        resource: "trial_balance",
        resourceId: record.id,
        metadata: { entityId, periodId, rowCount: rows.length, sheetName },
      });
      res.status(201).json(record);
    } catch (e) {
      next(e);
    }
  },
);

/** POST /api/uploads/pprec-file – upload PPREC (reconciliation working), normalize into pprec_lines. */
uploadsRouter.post(
  "/pprec-file",
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file?.buffer)
        return res.status(400).json({ error: "No file uploaded" });
      const sheetName = req.body.sheetName || req.body.sheet;
      const entityId = req.body.entityId || undefined;
      const periodId = req.body.periodId || undefined;
      const fiscalYear = req.body.fiscalYear || undefined;
      if (entityId && !canAccessEntity(req.user, entityId))
        return res.status(403).json({ error: "Access denied" });
      const rows = uploadService.parseExcelSheet(req.file.buffer, sheetName);
      const record = uploadService.savePprecUpload({
        entityId,
        periodId,
        fiscalYear,
        rows,
        version: 1,
        uploadedBy: req.user.sub,
      });
      await createAuditEntry({
        userId: req.user.sub,
        action: "UPLOAD_SCHEDULE",
        resource: "pprec_upload",
        resourceId: record.id,
        metadata: { entityId, periodId, rowCount: rows.length, sheetName },
      });
      res.status(201).json(record);
    } catch (e) {
      next(e);
    }
  },
);

/** POST /api/uploads/schedule – save prepayment schedule (body: entityId, periodId, rows, version). */
uploadsRouter.post(
  "/schedule",
  [
    body("entityId").optional(),
    body("periodId").optional(),
    body("rows").isArray(),
    body("version").optional().isInt({ min: 1 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const { entityId, periodId, rows, version } = req.body;
      if (entityId && !canAccessEntity(req.user, entityId))
        return res.status(403).json({ error: "Access denied" });
      const record = uploadService.savePrepaymentSchedule({
        entityId,
        periodId,
        rows,
        version,
        uploadedBy: req.user.sub,
      });
      await createAuditEntry({
        userId: req.user.sub,
        action: "UPLOAD_SCHEDULE",
        resource: "prepayment_schedule",
        resourceId: record.id,
        metadata: { entityId, periodId, rowCount: rows.length },
      });
      res.status(201).json(record);
    } catch (e) {
      next(e);
    }
  },
);

/** POST /api/uploads/trial-balance – save trial balance. */
uploadsRouter.post(
  "/trial-balance",
  [
    body("entityId").optional(),
    body("periodId").optional(),
    body("rows").isArray(),
    body("version").optional().isInt({ min: 1 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const { entityId, periodId, rows, version } = req.body;
      if (entityId && !canAccessEntity(req.user, entityId))
        return res.status(403).json({ error: "Access denied" });
      const record = uploadService.saveTrialBalance({
        entityId,
        periodId,
        rows,
        version,
        uploadedBy: req.user.sub,
      });
      await createAuditEntry({
        userId: req.user.sub,
        action: "UPLOAD_TB",
        resource: "trial_balance",
        resourceId: record.id,
        metadata: { entityId, periodId, rowCount: rows.length },
      });
      res.status(201).json(record);
    } catch (e) {
      next(e);
    }
  },
);

uploadsRouter.get("/schedule", async (req, res, next) => {
  try {
    const entityId = req.query.entityId ?? null;
    const periodId = req.query.periodId ?? null;
    if (entityId && !canAccessEntity(req.user, entityId))
      return res.status(403).json({ error: "Access denied" });
    const list = uploadService.listPrepaymentSchedules(entityId, periodId);
    res.json({ uploads: list });
  } catch (e) {
    next(e);
  }
});

uploadsRouter.get("/trial-balance", async (req, res, next) => {
  try {
    const entityId = req.query.entityId ?? null;
    const periodId = req.query.periodId ?? null;
    if (entityId && !canAccessEntity(req.user, entityId))
      return res.status(403).json({ error: "Access denied" });
    const list = uploadService.listTrialBalances(entityId, periodId);
    res.json({ uploads: list });
  } catch (e) {
    next(e);
  }
});

uploadsRouter.get("/schedule/:id", async (req, res, next) => {
  try {
    const record = uploadService.getPrepaymentSchedule(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });
    if (record.entityId && !canAccessEntity(req.user, record.entityId))
      return res.status(403).json({ error: "Access denied" });
    res.json(record);
  } catch (e) {
    next(e);
  }
});

uploadsRouter.get("/trial-balance/:id", async (req, res, next) => {
  try {
    const record = uploadService.getTrialBalance(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });
    if (record.entityId && !canAccessEntity(req.user, record.entityId))
      return res.status(403).json({ error: "Access denied" });
    res.json(record);
  } catch (e) {
    next(e);
  }
});

uploadsRouter.get("/pprec", async (req, res, next) => {
  try {
    const entityId = req.query.entityId ?? null;
    const periodId = req.query.periodId ?? null;
    if (entityId && !canAccessEntity(req.user, entityId))
      return res.status(403).json({ error: "Access denied" });
    const list = uploadService.listPprecUploads(entityId, periodId);
    res.json({ uploads: list });
  } catch (e) {
    next(e);
  }
});

uploadsRouter.get("/pprec/:id", async (req, res, next) => {
  try {
    const record = uploadService.getPprecUpload(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });
    if (record.entityId && !canAccessEntity(req.user, record.entityId))
      return res.status(403).json({ error: "Access denied" });
    res.json(record);
  } catch (e) {
    next(e);
  }
});

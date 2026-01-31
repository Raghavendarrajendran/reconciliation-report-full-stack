import { Router } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import * as authService from "../services/auth-service.js";
import { createAuditEntry } from "../services/audit-service.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
    body("name").optional().trim(),
    body("role").optional().isString(),
    body("entityIds").optional().isArray(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const result = await authService.registerUser(req.body);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const result = await authService.loginUser(
        req.body.email,
        req.body.password,
      );
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post(
  "/refresh",
  [body("refreshToken").notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      const result = await authService.refreshAccessToken(
        req.body.refreshToken,
      );
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post("/logout", authenticate, async (req, res, next) => {
  try {
    await createAuditEntry({
      userId: req.user.sub,
      action: "LOGOUT",
      resource: "auth",
      metadata: { email: req.user.email },
    });
    res.json({ message: "Logged out" });
  } catch (e) {
    next(e);
  }
});

authRouter.get("/me", authenticate, (req, res) => {
  res.json({
    user: {
      id: req.user.sub,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      entityIds: req.user.entityIds ?? [],
    },
  });
});

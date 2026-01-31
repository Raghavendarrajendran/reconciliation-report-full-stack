import jwt from "jsonwebtoken";
import { ROLES } from "../config/constants.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

/**
 * Verify JWT and attach user to req.user (id, email, role, entityIds).
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Require at least one of the given roles.
 * Usage: requireRoles(ROLES.ADMIN, ROLES.APP_ADMINISTRATOR)
 */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ error: "Authentication required" });
    if (allowedRoles.includes(req.user.role)) return next();
    return res.status(403).json({ error: "Insufficient permissions" });
  };
}

/**
 * Require user to have access to the given entity (by id).
 * App Admin / Admin see all; others only their assigned entities.
 */
export function requireEntityAccess(req, res, next) {
  if (!req.user)
    return res.status(401).json({ error: "Authentication required" });
  if (
    req.user.role === ROLES.APP_ADMINISTRATOR ||
    req.user.role === ROLES.ADMIN
  )
    return next();
  const entityId =
    req.params.entityId ?? req.body?.entityId ?? req.query?.entityId;
  if (!entityId) return next();
  const entityIds = req.user.entityIds ?? [];
  if (entityIds.includes(entityId)) return next();
  return res.status(403).json({ error: "Access denied to this entity" });
}

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { ROLES } from "../config/constants.js";
import { getStore } from "../store/index.js";
import { createAuditEntry } from "./audit-service.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export async function registerUser({
  email,
  password,
  name,
  role,
  entityIds = [],
}) {
  const store = getStore();
  const existing = store.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  if (existing)
    throw Object.assign(new Error("User already exists"), { status: 400 });
  const id = uuidv4();
  const hashed = await hashPassword(password);
  const user = {
    id,
    email: email.toLowerCase(),
    passwordHash: hashed,
    name: name || email,
    role: role || ROLES.ENTITY_USER,
    entityIds: Array.isArray(entityIds) ? entityIds : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
  store.users.push(user);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    entityIds: user.entityIds,
  };
}

export async function loginUser(email, password) {
  const store = getStore();
  const user = store.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && !u.deletedAt,
  );
  if (!user)
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid)
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    entityIds: user.entityIds,
    name: user.name,
  };
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  const refreshToken = jwt.sign({ sub: user.id, type: "refresh" }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
  await createAuditEntry({
    userId: user.id,
    action: "LOGIN",
    resource: "auth",
    metadata: { email: user.email },
  });
  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_EXPIRES_IN,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      entityIds: user.entityIds,
    },
  };
}

export async function refreshAccessToken(refreshToken) {
  const decoded = jwt.verify(refreshToken, JWT_SECRET);
  if (decoded.type !== "refresh")
    throw Object.assign(new Error("Invalid refresh token"), { status: 401 });
  const store = getStore();
  const user = store.users.find((u) => u.id === decoded.sub && !u.deletedAt);
  if (!user) throw Object.assign(new Error("User not found"), { status: 401 });
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    entityIds: user.entityIds,
    name: user.name,
  };
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  return { accessToken, expiresIn: JWT_EXPIRES_IN };
}

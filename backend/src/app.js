/**
 * Express app – used by both local server (index.js) and Vercel serverless (api/).
 * Export default app; do not call app.listen() here.
 */
import "dotenv/config";
import express from "express";
import { getStore } from "./store/index.js";
import * as authService from "./services/auth-service.js";
import * as entityService from "./services/entity-service.js";
import * as periodService from "./services/period-service.js";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { entitiesRouter } from "./routes/entities.js";
import { glAccountsRouter } from "./routes/gl-accounts.js";
import { mappingsRouter } from "./routes/mappings.js";
import { periodsRouter } from "./routes/periods.js";
import { uploadsRouter } from "./routes/uploads.js";
import { reconciliationsRouter } from "./routes/reconciliations.js";
import { adjustmentsRouter } from "./routes/adjustments.js";
import { dashboardsRouter } from "./routes/dashboards.js";
import { reportsRouter } from "./routes/reports.js";
import { auditRouter } from "./routes/audit.js";
import { settingsRouter } from "./routes/settings.js";
import { errorHandler } from "./middleware/error-handler.js";
import swaggerUi from "swagger-ui-express";
import openApiSpec from "./config/openapi.js";

const app = express();

// Swagger API documentation at /api/api-docs (no auth required for viewing)
app.use(
  "/api/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Prepayment Reconciliation API",
  }),
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));

let seedDone = false;
async function ensureSeed() {
  if (seedDone) return;
  seedDone = true;
  const store = getStore();
  if (store.users.some((u) => u.email === "admin@example.com")) return;
  try {
    await authService.registerUser({
      email: "admin@example.com",
      password: "Admin123!",
      name: "App Administrator",
      role: "APP_ADMINISTRATOR",
      entityIds: [],
    });
    if (store.entities.length === 0) {
      entityService.createEntity({
        code: "ENT01",
        name: "Entity One",
        currency: "USD",
      });
      entityService.createEntity({
        code: "ENT02",
        name: "Entity Two",
        currency: "EUR",
      });
    }
    if (store.fiscalPeriods.length === 0) {
      periodService.createPeriod({
        code: "2024-Q1",
        name: "2024 Q1",
        startDate: "2024-01-01",
        endDate: "2024-03-31",
      });
      periodService.createPeriod({
        code: "2024-Q2",
        name: "2024 Q2",
        startDate: "2024-04-01",
        endDate: "2024-06-30",
      });
    }
    console.log("Seed: admin@example.com / Admin123! and sample data created.");
  } catch (e) {
    console.warn("Seed skip:", e.message);
  }
}
app.use((req, res, next) => {
  ensureSeed().then(next).catch(next);
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/entities", entitiesRouter);
app.use("/api/gl-accounts", glAccountsRouter);
app.use("/api/mappings", mappingsRouter);
app.use("/api/periods", periodsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/reconciliations", reconciliationsRouter);
app.use("/api/adjustments", adjustmentsRouter);
app.use("/api/dashboards", dashboardsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/audit", auditRouter);
app.use("/api/settings", settingsRouter);

app.get("/api/health", (_, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

app.use(errorHandler);

export default app;

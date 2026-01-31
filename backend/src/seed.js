/**
 * Seed script: creates default admin user and sample entities/periods if store is empty.
 * Run: node src/seed.js (after getStore is available).
 */
import * as authService from "./services/auth-service.js";
import { getStore } from "./store/index.js";
import * as entityService from "./services/entity-service.js";
import * as periodService from "./services/period-service.js";

async function seed() {
  const store = getStore();
  if (store.users.some((u) => u.email === "admin@example.com")) {
    console.log("Seed: admin user already exists.");
    return;
  }
  await authService.registerUser({
    email: "admin@example.com",
    password: "Admin123!",
    name: "App Administrator",
    role: "APP_ADMINISTRATOR",
    entityIds: [],
  });
  console.log("Seed: created admin@example.com / Admin123!");

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
    console.log("Seed: created sample entities.");
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
    console.log("Seed: created sample periods.");
  }
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});

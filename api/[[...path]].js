/**
 * Vercel serverless entry for /api/* – forwards all requests to the Express app.
 * Deploy from repo root so backend is available as ../backend.
 */
import app from "../backend/src/app.js";

export default function handler(req, res) {
  return app(req, res);
}

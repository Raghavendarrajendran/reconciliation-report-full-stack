/**
 * Vercel serverless handler for /api (exact path). Forwards to Express app.
 */
import app from "../backend/src/app.js";

export default function handler(req, res) {
  return app(req, res);
}

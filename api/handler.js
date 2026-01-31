/**
 * Single Vercel serverless handler for all /api/* (via rewrite).
 * Restores req.url from ?path= so Express routes correctly.
 */
import app from "../backend/src/app.js";

export default function handler(req, res) {
  const path = req.url?.includes("?path=")
    ? "/api/" + (new URL(req.url || "", "http://x").searchParams.get("path") || "")
    : req.url;
  if (path && path !== req.url) {
    req.url = path;
  }
  return app(req, res);
}

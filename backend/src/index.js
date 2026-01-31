/**
 * Local dev server – runs Express on a port.
 * On Vercel, the app is served via api/ (serverless); this file is not used.
 */
import app from "./app.js";

const PORT = process.env.PORT || 4000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Reconciliation API running on http://localhost:${PORT}`);
  });
}

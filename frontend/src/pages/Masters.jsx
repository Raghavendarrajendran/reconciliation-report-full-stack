import { Link } from "react-router-dom";

export function Masters() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Master Data</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Admin-controlled masters: entities, GL accounts, mappings, periods,
        tolerance.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/entities"
          className="rounded-xl border bg-white dark:bg-slate-800 p-4 shadow-sm hover:border-sky-500"
        >
          Entities
        </Link>
        <Link
          to="/gl-accounts"
          className="rounded-xl border bg-white dark:bg-slate-800 p-4 shadow-sm hover:border-sky-500"
        >
          GL Accounts
        </Link>
        <Link
          to="/periods"
          className="rounded-xl border bg-white dark:bg-slate-800 p-4 shadow-sm hover:border-sky-500"
        >
          Fiscal Periods
        </Link>
      </div>
    </div>
  );
}

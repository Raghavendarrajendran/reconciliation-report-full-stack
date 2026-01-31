import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardsApi } from "../lib/api";

const statusColors = {
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  AUTO_CLOSED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  PENDING_CHECKER:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  CLOSED: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300",
  REOPENED:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

export function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => dashboardsApi.summary({}),
  });

  if (isLoading)
    return <div className="text-slate-500">Loading dashboard...</div>;

  const byStatus = data?.byStatus ?? {};
  const total = data?.total ?? 0;
  const pendingApprovals = data?.pendingApprovals ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Dashboard
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Welcome, {user?.name || user?.email}. Role:{" "}
        <strong>{user?.role}</strong>
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Total Reconciliations
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
            {total}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Pending Approvals
          </div>
          <div className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-400">
            {pendingApprovals}
          </div>
          {(user?.role === "CHECKER" || user?.role === "ADMIN") &&
            pendingApprovals > 0 && (
              <Link
                to="/adjustments?status=PENDING_APPROVAL"
                className="mt-2 inline-block text-sm text-sky-600 dark:text-sky-400 hover:underline"
              >
                View →
              </Link>
            )}
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Open
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
            {byStatus.OPEN ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Closed / Auto-closed
          </div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {(byStatus.CLOSED ?? 0) + (byStatus.AUTO_CLOSED ?? 0)}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          By status
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(byStatus).map(([status, count]) => (
            <span
              key={status}
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusColors[status] ?? "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300"}`}
            >
              {status.replace(/_/g, " ")}: {count}
            </span>
          ))}
          {Object.keys(byStatus).length === 0 && (
            <span className="text-slate-500">
              No data yet. Upload schedules and run reconciliation.
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/uploads"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          Upload Center
        </Link>
        <Link
          to="/reconciliations"
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          Reconciliations
        </Link>
        <Link
          to="/reports"
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          Reports
        </Link>
      </div>
    </div>
  );
}

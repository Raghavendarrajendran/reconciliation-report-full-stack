import { useState } from "react";
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

const COLUMNS = [
  {
    key: "beginIn2021Prepaid",
    label: "Begin in 2021 Prepaid",
    className: "text-right tabular-nums",
  },
  {
    key: "beginIn2022Prepaid",
    label: "Begin in 2022 Prepaid",
    className: "text-right tabular-nums",
  },
  {
    key: "beginIn2023Prepaid",
    label: "Begin in 2023 Prepaid",
    className: "text-right tabular-nums",
  },
  {
    key: "beginIn2024Prepaid",
    label: "Begin in 2024 Prepaid",
    className: "text-right tabular-nums",
  },
  {
    key: "beginIn2025Prepaid",
    label: "Begin in 2025 Prepaid",
    className: "text-right tabular-nums",
  },
  {
    key: "totalSubsystem",
    label: "Total Subsystem as on Today",
    className: "text-right tabular-nums font-medium",
  },
  {
    key: "glBalance",
    label: "GL Balance as on Report Date",
    className: "text-right tabular-nums",
  },
  {
    key: "difference",
    label: "Difference",
    className: "text-right tabular-nums",
  },
  {
    key: "reconEntries",
    label: "Recon Entries",
    className: "text-right tabular-nums",
  },
  {
    key: "finalDifference",
    label: "Final Difference",
    className: "text-right tabular-nums font-medium",
  },
  { key: "status", label: "Status", className: "text-center" },
];

function fmt(num) {
  if (num == null || num === "") return "—";
  const n = Number(num);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function Dashboard() {
  const { user } = useAuth();
  const [entityFilter, setEntityFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [expandedEntities, setExpandedEntities] = useState(new Set());

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard-summary", entityFilter, periodFilter],
    queryFn: () =>
      dashboardsApi.summary({
        ...(entityFilter && { entityId: entityFilter }),
        ...(periodFilter && { periodId: periodFilter }),
      }),
  });

  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: ["dashboard-reconciliation-table", entityFilter, periodFilter],
    queryFn: () =>
      dashboardsApi.reconciliationTable({
        ...(entityFilter && { entityId: entityFilter }),
        ...(periodFilter && { periodId: periodFilter }),
      }),
  });

  const toggleEntity = (eid) => {
    setExpandedEntities((prev) => {
      const next = new Set(prev);
      if (next.has(eid)) next.delete(eid);
      else next.add(eid);
      return next;
    });
  };

  if (summaryLoading)
    return <div className="text-slate-500">Loading dashboard...</div>;

  const byStatus = summaryData?.byStatus ?? {};
  const total = summaryData?.total ?? 0;
  const pendingApprovals = summaryData?.pendingApprovals ?? 0;
  const varianceTotals = summaryData?.varianceTotals ?? {};
  const byEntity = summaryData?.byEntity ?? {};
  const byPeriod = summaryData?.byPeriod ?? {};

  const byEntityTable = tableData?.byEntity ?? {};
  const entityIds =
    tableData?.entities ?? Object.keys(byEntityTable).filter((k) => k !== "_");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Reconciliation Dashboard
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Welcome, {user?.name || user?.email}. Role:{" "}
        <strong>{user?.role}</strong>
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
            Open
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
            {(byStatus.OPEN ?? 0) +
              (byStatus.REOPENED ?? 0) +
              (byStatus.PENDING_CHECKER ?? 0)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Closed
          </div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {(byStatus.CLOSED ?? 0) + (byStatus.AUTO_CLOSED ?? 0)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Variance total (open)
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {Number(varianceTotals.openSum ?? 0).toLocaleString()}
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
      </div>

      {/* Reconciliation table: one section per entity */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <h2 className="p-4 text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700">
          Reconciliation by Entity
        </h2>
        {tableLoading ? (
          <div className="p-6 text-slate-500">
            Loading reconciliation table...
          </div>
        ) : entityIds.length === 0 ? (
          <div className="p-6 text-slate-500">
            No reconciliation data. Upload Prepayment Schedule, PPREC, and Trial
            Balance; then run reconciliation per entity/period.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {entityIds.map((eid) => {
              const section = byEntityTable[eid];
              const rows = section?.rows ?? [];
              const totals = section?.totals ?? null;
              const isExpanded = expandedEntities.has(eid);
              return (
                <div key={eid} className="bg-white dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => toggleEntity(eid)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {eid === "_" ? "—" : eid}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {rows.length} account{rows.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-slate-400" aria-hidden>
                      {isExpanded ? "▼" : "▶"}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
                      <table className="w-full min-w-[900px] text-sm">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-700/50">
                            <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-100 dark:bg-slate-700/50 z-10">
                              Account
                            </th>
                            {COLUMNS.map((col) => (
                              <th
                                key={col.key}
                                className={`px-3 py-2 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap ${col.className ?? ""}`}
                              >
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr
                              key={row.id}
                              className="border-t border-slate-200 dark:border-slate-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20"
                            >
                              <td className="px-3 py-2 sticky left-0 bg-white dark:bg-slate-800 z-10 font-medium text-slate-900 dark:text-white">
                                <Link
                                  to={`/reconciliations/${row.id}?evidence=1`}
                                  className="text-sky-600 dark:text-sky-400 hover:underline"
                                >
                                  {row.prepaidAccount ?? "—"}
                                </Link>
                              </td>
                              {COLUMNS.map((col) => (
                                <td
                                  key={col.key}
                                  className={`px-3 py-2 text-slate-700 dark:text-slate-300 ${col.className ?? ""}`}
                                >
                                  {col.key === "status" ? (
                                    <span
                                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                        statusColors[row.status] ??
                                        "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300"
                                      }`}
                                    >
                                      {row.status ?? "—"}
                                    </span>
                                  ) : (
                                    fmt(row[col.key])
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {totals && (
                            <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-amber-50 dark:bg-amber-900/20 font-semibold text-slate-900 dark:text-white">
                              <td className="px-3 py-2 sticky left-0 bg-amber-50 dark:bg-amber-900/20 z-10">
                                Total
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {fmt(totals.beginIn2021Prepaid)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {fmt(totals.beginIn2022Prepaid)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {fmt(totals.beginIn2023Prepaid)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {fmt(totals.beginIn2024Prepaid)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {fmt(totals.beginIn2025Prepaid)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {fmt(totals.totalSubsystem)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {fmt(totals.glBalance)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {fmt(totals.difference)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {fmt(totals.reconEntries)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {fmt(totals.finalDifference)}
                              </td>
                              <td className="px-3 py-2" />
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
                No data yet. Upload all three files and run reconciliation.
              </span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
            By entity
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byEntity).map(([eid, count]) => (
              <span
                key={eid}
                className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-300"
              >
                {eid === "_" ? "—" : eid}: {count}
              </span>
            ))}
            {Object.keys(byEntity).length === 0 && (
              <span className="text-slate-500">—</span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          By period
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(byPeriod).map(([pid, count]) => (
            <span
              key={pid}
              className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-300"
            >
              {pid === "_" ? "—" : pid}: {count}
            </span>
          ))}
          {Object.keys(byPeriod).length === 0 && (
            <span className="text-slate-500">—</span>
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

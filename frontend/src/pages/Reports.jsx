import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { reportsApi } from "../lib/api";

export function Reports() {
  const [dataset, setDataset] = useState("reconciliations");
  const [entityId, setEntityId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [status, setStatus] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["report-dynamic", dataset, entityId, periodId, status],
    queryFn: () => reportsApi.dynamic({ dataset, entityId, periodId, status }),
  });
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Reports
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Filter and view reconciliation or adjustment data. Export via your
          browser or share filters with your team.
        </p>
      </div>

      <div className="card-soft p-4">
        <h2
          className="mb-3 text-sm font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}
        >
          Filters
        </h2>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1">
            <span
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Dataset
            </span>
            <select
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
              className="input-soft w-48"
            >
              <option value="reconciliations">Reconciliations</option>
              <option value="adjustments">Adjustments</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Entity ID
            </span>
            <input
              placeholder="Optional"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="input-soft w-40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Period ID
            </span>
            <input
              placeholder="Optional"
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              className="input-soft w-40"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Status
            </span>
            <input
              placeholder="e.g. OPEN, CLOSED"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-soft w-40"
            />
          </label>
        </div>
      </div>

      <div className="card-soft overflow-hidden">
        {isLoading ? (
          <div
            className="flex items-center justify-center py-12"
            style={{ color: "var(--text-secondary)" }}
          >
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              className="mb-3 h-12 w-12 opacity-40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: "var(--text-secondary)" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              No rows
            </p>
            <p
              className="mt-1 max-w-sm text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              No data matches the current filters. Try changing filters or run
              reconciliations first.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-soft w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr>
                  {Object.keys(rows[0] || {}).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="tabular-nums">
                        {val != null && typeof val === "object"
                          ? JSON.stringify(val)
                          : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 100 && (
          <p
            className="border-t px-4 py-2 text-xs"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            Showing first 100 of {rows.length} rows.
          </p>
        )}
      </div>
    </div>
  );
}

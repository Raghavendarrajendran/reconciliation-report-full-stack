import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { reconciliationsApi, entitiesApi, periodsApi } from "../lib/api";

export function Reconciliations() {
  const [searchParams] = useSearchParams();
  const entityId = searchParams.get("entityId") || "";
  const periodId = searchParams.get("periodId") || "";
  const status = searchParams.get("status") || "";
  const [runEntityId, setRunEntityId] = useState("");
  const [runPeriodId, setRunPeriodId] = useState("");
  const [runFiscalYear, setRunFiscalYear] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["reconciliations", entityId, periodId, status],
    queryFn: () => reconciliationsApi.list({ entityId, periodId, status }),
  });
  const { data: entitiesData } = useQuery({
    queryKey: ["entities"],
    queryFn: () => entitiesApi.list(),
  });
  const { data: periodsData } = useQuery({
    queryKey: ["periods"],
    queryFn: () => periodsApi.list(),
  });
  const entities = entitiesData?.entities ?? [];
  const periods = periodsData?.periods ?? [];

  const [runMessage, setRunMessage] = useState(null);
  const runMutation = useMutation({
    mutationFn: (body) => reconciliationsApi.run(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries(["reconciliations"]);
      const count = data?.reconciliations?.length ?? 0;
      if (count === 0)
        setRunMessage(
          "Run complete. No reconciliations generated. Upload Prepayment Schedule and Trial Balance in Upload Center for this entity and period, then run again.",
        );
      else setRunMessage(`Run complete. ${count} reconciliation(s) created.`);
      setTimeout(() => setRunMessage(null), 6000);
    },
  });

  const recs = data?.reconciliations ?? [];
  if (isLoading) return <div>Loading...</div>;
  return (
    <div className="space-y-4">
      <h1
        className="text-2xl font-bold tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        Reconciliations
      </h1>
      <div className="card-soft flex flex-wrap items-end gap-3 p-4">
        <label className="flex flex-col gap-1">
          <span
            className="text-xs font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Entity
          </span>
          <select
            value={runEntityId}
            onChange={(e) => setRunEntityId(e.target.value)}
            className="input-soft w-48"
          >
            <option value="">Select entity</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name || e.code}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span
            className="text-xs font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Period
          </span>
          <select
            value={runPeriodId}
            onChange={(e) => setRunPeriodId(e.target.value)}
            className="input-soft w-48"
          >
            <option value="">Select period</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.code}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span
            className="text-xs font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Fiscal year (optional)
          </span>
          <input
            type="text"
            value={runFiscalYear}
            onChange={(e) => setRunFiscalYear(e.target.value)}
            placeholder="e.g. 2024"
            className="input-soft w-32"
          />
        </label>
        <button
          type="button"
          onClick={() =>
            runMutation.mutate({
              entityId: runEntityId,
              periodId: runPeriodId,
              fiscalYear: runFiscalYear || undefined,
            })
          }
          disabled={!runEntityId || !runPeriodId || runMutation.isPending}
          className="btn-primary"
        >
          {runMutation.isPending ? "Running…" : "Run reconciliation"}
        </button>
        {runMessage && (
          <p
            className="w-full text-sm"
            style={{
              color: runMessage.includes("No reconciliations")
                ? "var(--text-secondary)"
                : "var(--text-primary)",
            }}
          >
            {runMessage}
          </p>
        )}
      </div>
      {recs.length === 0 && !runMessage && (
        <div
          className="card-soft flex flex-col gap-2 p-4"
          style={{ color: "var(--text-secondary)" }}
        >
          <p className="text-sm font-medium">No reconciliations yet.</p>
          <p className="text-sm">
            Upload <strong>Prepayment Schedule</strong> and{" "}
            <strong>Trial Balance</strong> in{" "}
            <Link
              to="/uploads"
              className="text-sky-600 hover:underline dark:text-sky-400"
            >
              Upload Center
            </Link>{" "}
            for an Entity and Period. Then run reconciliation above using the{" "}
            <strong>same Entity and Period</strong>.
          </p>
        </div>
      )}
      <div className="card-soft overflow-x-auto">
        <table className="table-soft w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Expected</th>
              <th className="px-4 py-3 font-medium">TB</th>
              <th className="px-4 py-3 font-medium">Variance</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recs.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No rows. Run reconciliation above or upload Schedule and TB
                  first.
                </td>
              </tr>
            )}
            {recs.map((r) => (
              <tr key={r.id}>
                <td
                  className="px-4 py-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {r.entityId}
                </td>
                <td
                  className="px-4 py-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {r.periodId}
                </td>
                <td
                  className="px-4 py-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {r.prepaidAccount ?? r.prepaidAccountId}
                </td>
                <td
                  className="px-4 py-3 tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {Number(
                    r.expectedClosingAdjusted ?? r.expectedClosing,
                  ).toLocaleString()}
                </td>
                <td
                  className="px-4 py-3 tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {r.actualClosing != null
                    ? Number(r.actualClosing).toLocaleString()
                    : r.tbClosing != null
                      ? Number(r.tbClosing).toLocaleString()
                      : "-"}
                </td>
                <td
                  className="px-4 py-3 tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {r.variance != null
                    ? Number(r.variance).toLocaleString()
                    : "-"}
                </td>
                <td
                  className="px-4 py-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {r.status}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={"/reconciliations/" + r.id}
                    className="text-sky-600 hover:underline"
                  >
                    View
                  </Link>
                  {(r.status === "OPEN" || r.status === "REOPENED") && (
                    <>
                      {" · "}
                      <Link
                        to={"/adjustments?reconciliationId=" + r.id}
                        className="text-sky-600 hover:underline"
                      >
                        Propose
                      </Link>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

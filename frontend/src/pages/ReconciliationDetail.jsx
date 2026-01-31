import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { reconciliationsApi, adjustmentsApi } from "../lib/api";

function Card({ title, children, className = "" }) {
  return (
    <div className={"card-soft p-4 " + className}>
      <h3
        className="mb-3 text-sm font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-secondary)" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export function ReconciliationDetail() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["reconciliation", id],
    queryFn: () => reconciliationsApi.get(id, true),
  });
  const { data: adjustmentsData } = useQuery({
    queryKey: ["adjustments", id],
    queryFn: () => adjustmentsApi.list({ reconciliationId: id }),
  });

  const rec = data;
  const evidence = rec?.evidence;
  const adjustments = adjustmentsData?.adjustments ?? [];

  if (isLoading)
    return <div style={{ color: "var(--text-secondary)" }}>Loading…</div>;
  if (!rec) return <div>Reconciliation not found.</div>;

  const expectedDisplay = rec.expectedClosingAdjusted ?? rec.expectedClosing;
  const formula = evidence?.expectedClosingFormula;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/reconciliations"
            className="text-sm hover:underline"
            style={{ color: "var(--text-secondary)" }}
          >
            ← Reconciliations
          </Link>
          <h1
            className="mt-1 text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Reconciliation detail
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            {rec.entityId} · {rec.periodId} ·{" "}
            {rec.prepaidAccount ?? rec.prepaidAccountId}
          </p>
        </div>
        <span
          className="inline-flex rounded-full px-3 py-1 text-sm font-medium"
          style={{
            background:
              rec.status === "CLOSED"
                ? "var(--color-success, #15803d)"
                : "var(--color-warning, #ca8a04)",
            color: "#fff",
          }}
        >
          {rec.status}
        </span>
      </div>

      <section aria-label="Accounting Story">
        <h2
          className="mb-3 text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Accounting story
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card title="Expected closing calculation">
            <ul className="space-y-1 text-sm">
              <li>
                Opening balance:{" "}
                <strong className="tabular-nums">
                  {Number(rec.openingBalance).toLocaleString()}
                </strong>
              </li>
              <li>
                Additions:{" "}
                <strong className="tabular-nums">
                  + {Number(rec.additions).toLocaleString()}
                </strong>
              </li>
              <li>
                Amortization:{" "}
                <strong className="tabular-nums">
                  − {Number(rec.amortization).toLocaleString()}
                </strong>
              </li>
              {formula?.adjustmentImpact != null &&
                Number(formula.adjustmentImpact) !== 0 && (
                  <li>
                    Adjustment impact:{" "}
                    <strong className="tabular-nums">
                      {Number(formula.adjustmentImpact) >= 0 ? "+ " : ""}
                      {Number(formula.adjustmentImpact).toLocaleString()}
                    </strong>
                  </li>
                )}
              <li
                className="border-t pt-2"
                style={{ borderColor: "var(--border)" }}
              >
                Expected closing{" "}
                {formula?.expectedClosingAdjusted != null ? "(adjusted)" : ""}:{" "}
                <strong className="tabular-nums">
                  {Number(expectedDisplay).toLocaleString()}
                </strong>
              </li>
            </ul>
          </Card>
          <Card title="Trial balance (actual)">
            {evidence?.sourceTbRow ? (
              <div className="text-sm">
                <p>
                  Account: <strong>{evidence.sourceTbRow.account}</strong>
                </p>
                <p className="tabular-nums">
                  Closing balance:{" "}
                  <strong>
                    {Number(
                      evidence.sourceTbRow.closingBalanceSigned,
                    ).toLocaleString()}
                  </strong>
                </p>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No TB row used (missing).
              </p>
            )}
          </Card>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <Card title="Variance" className="flex-1 min-w-[200px]">
            <p className="text-lg tabular-nums">
              Actual − Expected ={" "}
              {rec.variance != null
                ? Number(rec.variance).toLocaleString()
                : rec.actualClosing != null && expectedDisplay != null
                  ? Number(rec.actualClosing - expectedDisplay).toLocaleString()
                  : "—"}
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Tolerance used: {Number(rec.toleranceUsed ?? 0).toLocaleString()}
            </p>
          </Card>
        </div>
      </section>

      {evidence?.scheduleLinesContributing?.length > 0 && (
        <Card title="Schedule lines contributing to amortization">
          <div className="overflow-x-auto">
            <table className="table-soft w-full text-sm">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Credit</th>
                  <th>Debit</th>
                  <th>Apply date</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {evidence.scheduleLinesContributing.map((line) => (
                  <tr key={line.id}>
                    <td style={{ color: "var(--text-primary)" }}>
                      {line.account}
                    </td>
                    <td
                      className="tabular-nums"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {Number(line.creditAmount).toLocaleString()}
                    </td>
                    <td
                      className="tabular-nums"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {Number(line.debitAmount).toLocaleString()}
                    </td>
                    <td style={{ color: "var(--text-primary)" }}>
                      {line.applyDate ?? "—"}
                    </td>
                    <td style={{ color: "var(--text-primary)" }}>
                      {line.headerDesc ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {evidence?.warnings?.length > 0 && (
        <Card title="Warnings">
          <ul
            className="list-disc pl-4 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            {evidence.warnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Adjustments">
        {adjustments.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No adjustments.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {adjustments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2">
                <span style={{ color: "var(--text-primary)" }}>
                  {a.debitAccount ?? "Dr"} / {a.creditAccount ?? "Cr"}{" "}
                  {Number(a.amount).toLocaleString()}
                </span>
                <span
                  className="rounded px-1.5 text-xs"
                  style={{
                    background: "var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {a.status}
                </span>
                {a.impactOnPrepaid != null &&
                  Number(a.impactOnPrepaid) !== 0 && (
                    <span
                      className="tabular-nums"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Impact on prepaid:{" "}
                      {Number(a.impactOnPrepaid).toLocaleString()}
                    </span>
                  )}
              </li>
            ))}
          </ul>
        )}
        {(rec.status === "OPEN" || rec.status === "REOPENED") && (
          <Link
            to={"/adjustments?reconciliationId=" + rec.id}
            className="mt-3 inline-block text-sm font-medium"
            style={{ color: "var(--focus-ring)" }}
          >
            Propose adjustment →
          </Link>
        )}
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { reconciliationsApi, adjustmentsApi, auditApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";

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

const EVIDENCE_TABS = ["Story", "Schedule", "PPREC", "TB", "Warnings", "Audit"];

export function ReconciliationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [evidenceTab, setEvidenceTab] = useState("Story");
  const { data, isLoading } = useQuery({
    queryKey: ["reconciliation", id],
    queryFn: () => reconciliationsApi.get(id, true),
  });
  const { data: adjustmentsData } = useQuery({
    queryKey: ["adjustments", id],
    queryFn: () => adjustmentsApi.list({ reconciliationId: id }),
  });
  const canViewAudit = ["APP_ADMINISTRATOR", "ADMIN", "AUDITOR"].includes(
    user?.role,
  );
  const { data: auditData } = useQuery({
    queryKey: ["audit", id],
    queryFn: () =>
      auditApi.list({ resourceId: id, resource: "reconciliation", limit: 50 }),
    enabled: canViewAudit && evidenceTab === "Audit",
  });

  const rec = data;
  const evidence = rec?.evidence;
  const adjustments = adjustmentsData?.adjustments ?? [];
  const auditLogs = auditData?.auditLogs ?? [];

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const blob = new Blob(
                [
                  JSON.stringify(
                    { reconciliation: rec, evidence: rec.evidence },
                    null,
                    2,
                  ),
                ],
                { type: "application/json" },
              );
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `reconciliation-evidence-${id}.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          >
            Export evidence
          </button>
          <span
            className="inline-flex rounded-full px-3 py-1 text-sm font-medium"
            style={{
              background:
                rec.status === "CLOSED" || rec.status === "AUTO_CLOSED"
                  ? "var(--color-success, #15803d)"
                  : "var(--color-warning, #ca8a04)",
              color: "#fff",
            }}
          >
            {rec.status}
          </span>
        </div>
      </div>

      <section aria-label="Accounting Story">
        <h2
          className="mb-3 text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Accounting story & evidence
        </h2>
        <div
          className="mb-4 flex flex-wrap gap-1 border-b pb-2"
          style={{ borderColor: "var(--border)" }}
        >
          {EVIDENCE_TABS.filter((t) => t !== "Audit" || canViewAudit).map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setEvidenceTab(tab)}
                className={`rounded px-3 py-1.5 text-sm font-medium ${
                  evidenceTab === tab
                    ? "bg-sky-600 text-white dark:bg-sky-500"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                }`}
              >
                {tab}
              </button>
            ),
          )}
        </div>

        {evidenceTab === "Story" && (
          <>
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
                    {formula?.expectedClosingAdjusted != null
                      ? "(adjusted)"
                      : ""}
                    :{" "}
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
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
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
                      ? Number(
                          rec.actualClosing - expectedDisplay,
                        ).toLocaleString()
                      : "—"}
                </p>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Tolerance used:{" "}
                  {Number(rec.toleranceUsed ?? 0).toLocaleString()}
                </p>
              </Card>
            </div>
          </>
        )}

        {evidenceTab === "Schedule" && (
          <Card title="Schedule lines (amortization)">
            {(evidence?.scheduleLinesContributing?.length ?? 0) > 0 ? (
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
                        <td className="tabular-nums">
                          {Number(line.creditAmount).toLocaleString()}
                        </td>
                        <td className="tabular-nums">
                          {Number(line.debitAmount).toLocaleString()}
                        </td>
                        <td>{line.applyDate ?? "—"}</td>
                        <td>{line.headerDesc ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No schedule lines used for this reconciliation (amortization
                from PPREC or none).
              </p>
            )}
          </Card>
        )}

        {evidenceTab === "PPREC" && (
          <Card title="PPREC lines used">
            {(evidence?.pprecLines?.length ?? 0) > 0 ? (
              <div className="overflow-x-auto">
                <table className="table-soft w-full text-sm">
                  <thead>
                    <tr>
                      <th>Prepaid account</th>
                      <th>Opening</th>
                      <th>Additions</th>
                      <th>Amortization</th>
                      <th>Expected closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidence.pprecLines.map((line) => (
                      <tr key={line.id}>
                        <td style={{ color: "var(--text-primary)" }}>
                          {line.prepaidAccount}
                        </td>
                        <td className="tabular-nums">
                          {Number(line.openingBalance).toLocaleString()}
                        </td>
                        <td className="tabular-nums">
                          {Number(line.additions).toLocaleString()}
                        </td>
                        <td className="tabular-nums">
                          {Number(line.amortization).toLocaleString()}
                        </td>
                        <td className="tabular-nums">
                          {Number(
                            line.expectedClosing ??
                              line.openingBalance +
                                line.additions -
                                line.amortization,
                          ).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No PPREC row used for this account/period. Opening, additions,
                and amortization may come from schedule or be zero.
              </p>
            )}
          </Card>
        )}

        {evidenceTab === "TB" && (
          <Card title="Trial balance (actual closing)">
            {evidence?.sourceTbRow ? (
              <div className="text-sm">
                <p>
                  <strong>Account:</strong> {evidence.sourceTbRow.account}
                </p>
                <p className="tabular-nums mt-1">
                  <strong>Closing balance:</strong>{" "}
                  {Number(
                    evidence.sourceTbRow.closingBalanceSigned,
                  ).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No Trial Balance row found for this account and period (missing
                TB).
              </p>
            )}
          </Card>
        )}

        {evidenceTab === "Warnings" && (
          <Card title="Warnings">
            {(evidence?.warnings?.length ?? 0) > 0 ? (
              <ul
                className="list-disc pl-4 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {evidence.warnings.map((w, i) => (
                  <li key={i}>{w.message}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No warnings.
              </p>
            )}
          </Card>
        )}

        {evidenceTab === "Audit" && canViewAudit && (
          <Card title="Audit trail">
            {auditLogs.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {auditLogs.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap gap-2">
                    <span style={{ color: "var(--text-secondary)" }}>
                      {entry.timestamp}
                    </span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {entry.action}
                    </span>
                    {entry.metadata?.comment && (
                      <span>{entry.metadata.comment}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No audit entries for this reconciliation. Adjustments and
                approvals are listed in the Adjustments section below.
              </p>
            )}
          </Card>
        )}
      </section>

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

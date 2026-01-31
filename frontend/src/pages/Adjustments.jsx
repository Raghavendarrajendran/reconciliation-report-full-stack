import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { adjustmentsApi } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function Adjustments() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status") || "";
  const reconciliationId = searchParams.get("reconciliationId") || "";
  const [rejectComment, setRejectComment] = useState("");
  const [rejectId, setRejectId] = useState(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["adjustments", status, reconciliationId],
    queryFn: () =>
      adjustmentsApi.list({
        status: status || undefined,
        reconciliationId: reconciliationId || undefined,
      }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id }) => adjustmentsApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries(["adjustments"]),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }) => adjustmentsApi.reject(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries(["adjustments"]);
      setRejectId(null);
      setRejectComment("");
    },
  });

  const list = data?.adjustments ?? [];
  const canApprove =
    user?.role === "CHECKER" ||
    user?.role === "ADMIN" ||
    user?.role === "APP_ADMINISTRATOR";

  if (isLoading)
    return <div style={{ color: "var(--text-secondary)" }}>Loading...</div>;

  return (
    <div className="space-y-4">
      <h1
        className="text-2xl font-bold tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        Adjustments
      </h1>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Maker–Checker workflow. Propose from Reconciliations; approve or reject
        here.
      </p>
      <div className="card-soft overflow-x-auto">
        <table className="table-soft w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Reconciliation</th>
              <th className="px-4 py-3 font-medium">Debit</th>
              <th className="px-4 py-3 font-medium">Credit</th>
              <th className="px-4 py-3 font-medium">Explanation</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canApprove && <th className="px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No adjustments.
                </td>
              </tr>
            )}
            {list.map((a) => (
              <tr key={a.id}>
                <td
                  className="px-4 py-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {a.reconciliationId}
                </td>
                <td
                  className="px-4 py-3 tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {Number(a.debitAmount).toLocaleString()}
                </td>
                <td
                  className="px-4 py-3 tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {Number(a.creditAmount).toLocaleString()}
                </td>
                <td
                  className="px-4 py-3 max-w-xs truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {a.explanation}
                </td>
                <td
                  className="px-4 py-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {a.status}
                </td>
                {canApprove &&
                  a.status === "PENDING_APPROVAL" &&
                  a.makerId !== user?.id && (
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => approveMutation.mutate({ id: a.id })}
                        className="mr-2 text-emerald-600 hover:underline"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectId(a.id)}
                        className="text-red-600 hover:underline"
                      >
                        Reject
                      </button>
                      {rejectId === a.id && (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            placeholder="Reason (required)"
                            className="flex-1 rounded border px-2 py-1 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              rejectMutation.mutate({
                                id: a.id,
                                comment: rejectComment,
                              })
                            }
                            disabled={!rejectComment.trim()}
                            className="rounded bg-red-600 px-2 py-1 text-sm text-white disabled:opacity-50"
                          >
                            Submit
                          </button>
                        </div>
                      )}
                    </td>
                  )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

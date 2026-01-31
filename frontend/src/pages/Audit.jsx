import { useQuery } from "@tanstack/react-query";
import { auditApi } from "../lib/api";

export function Audit() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit"],
    queryFn: () => auditApi.list({ limit: 100 }),
  });
  const list = data?.auditLogs ?? [];
  if (isLoading) return <div>Loading...</div>;
  return (
    <div className="space-y-4">
      <h1
        className="text-2xl font-bold tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        Audit Log
      </h1>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Immutable trail of uploads, reconciliations, adjustments, approvals.
      </p>
      <div className="card-soft overflow-x-auto">
        <table className="table-soft w-full min-w-[500px] text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Resource</th>
              <th className="px-4 py-3 font-medium">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id}>
                <td
                  className="px-4 py-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {e.timestamp}
                </td>
                <td
                  className="px-4 py-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {e.userId}
                </td>
                <td
                  className="px-4 py-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {e.action}
                </td>
                <td
                  className="px-4 py-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {e.resource}
                </td>
                <td className="px-4 py-2 font-mono text-xs">
                  {JSON.stringify(e.metadata)}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No audit entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

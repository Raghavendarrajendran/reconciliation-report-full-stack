import { useQuery } from "@tanstack/react-query";
import { glAccountsApi } from "../lib/api";

export function GlAccounts() {
  const { data, isLoading } = useQuery({
    queryKey: ["gl-accounts"],
    queryFn: () => glAccountsApi.list(),
  });
  const list = data?.glAccounts ?? [];
  if (isLoading) return <div>Loading...</div>;
  return (
    <div className="space-y-4">
      <h1
        className="text-2xl font-bold tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        GL Accounts
      </h1>
      <div className="card-soft overflow-x-auto">
        <table className="table-soft w-full min-w-[400px] text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td
                  className="px-4 py-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {a.code}
                </td>
                <td
                  className="px-4 py-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {a.name}
                </td>
                <td
                  className="px-4 py-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {a.type}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No GL accounts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

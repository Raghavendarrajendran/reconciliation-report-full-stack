import { useQuery } from "@tanstack/react-query";
import { periodsApi } from "../lib/api";

export function Periods() {
  const { data, isLoading } = useQuery({
    queryKey: ["periods"],
    queryFn: () => periodsApi.list(),
  });
  const list = data?.periods ?? [];
  if (isLoading) return <div>Loading...</div>;
  return (
    <div className="space-y-4">
      <h1
        className="text-2xl font-bold tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        Fiscal Periods
      </h1>
      <div className="card-soft overflow-x-auto">
        <table className="table-soft w-full min-w-[400px] text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Start</th>
              <th className="px-4 py-3 font-medium">End</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td
                  className="px-4 py-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {p.code}
                </td>
                <td
                  className="px-4 py-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {p.name}
                </td>
                <td
                  className="px-4 py-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {p.startDate}
                </td>
                <td
                  className="px-4 py-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {p.endDate}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No periods.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

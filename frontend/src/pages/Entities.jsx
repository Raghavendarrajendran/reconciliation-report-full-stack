import { useQuery } from "@tanstack/react-query";
import { entitiesApi } from "../lib/api";

export function Entities() {
  const { data, isLoading } = useQuery({
    queryKey: ["entities"],
    queryFn: () => entitiesApi.list(),
  });
  const list = data?.entities ?? [];
  if (isLoading) return <div>Loading...</div>;
  return (
    <div className="space-y-4">
      <h1
        className="text-2xl font-bold tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        Entities
      </h1>
      <div className="card-soft overflow-x-auto">
        <table className="table-soft w-full min-w-[400px] text-left text-sm">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Currency</th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id}>
                <td style={{ color: "var(--text-primary)" }}>{e.code}</td>
                <td style={{ color: "var(--text-primary)" }}>{e.name}</td>
                <td style={{ color: "var(--text-primary)" }}>{e.currency}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center"
                  style={{ color: "var(--text-secondary)" }}
                >
                  No entities.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

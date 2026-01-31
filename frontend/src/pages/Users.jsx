import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../lib/api";

export function Users() {
  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list(),
  });
  const list = data?.users ?? [];
  if (isLoading) return <div>Loading...</div>;
  return (
    <div className="space-y-4">
      <h1
        className="text-2xl font-bold tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        Users
      </h1>
      <div className="card-soft overflow-x-auto">
        <table className="table-soft w-full min-w-[400px] text-left text-sm">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td style={{ color: "var(--text-primary)" }}>{u.email}</td>
                <td style={{ color: "var(--text-primary)" }}>{u.name}</td>
                <td style={{ color: "var(--text-primary)" }}>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

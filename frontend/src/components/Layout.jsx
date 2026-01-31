import { useState } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const navByRole = {
  APP_ADMINISTRATOR: [
    { to: "/", label: "Dashboard" },
    { to: "/users", label: "Users" },
    { to: "/entities", label: "Entities" },
    { to: "/masters", label: "Masters" },
    { to: "/uploads", label: "Upload Center" },
    { to: "/reconciliations", label: "Reconciliations" },
    { to: "/adjustments", label: "Adjustments" },
    { to: "/reports", label: "Reports" },
    { to: "/audit", label: "Audit" },
  ],
  ADMIN: [
    { to: "/", label: "Dashboard" },
    { to: "/entities", label: "Entities" },
    { to: "/masters", label: "Masters" },
    { to: "/uploads", label: "Upload Center" },
    { to: "/reconciliations", label: "Reconciliations" },
    { to: "/adjustments", label: "Adjustments" },
    { to: "/reports", label: "Reports" },
  ],
  ENTITY_USER: [
    { to: "/", label: "Dashboard" },
    { to: "/uploads", label: "Upload Center" },
    { to: "/reconciliations", label: "Reconciliations" },
    { to: "/reports", label: "Reports" },
  ],
  MAKER: [
    { to: "/", label: "Dashboard" },
    { to: "/uploads", label: "Upload Center" },
    { to: "/reconciliations", label: "Reconciliations" },
    { to: "/adjustments", label: "Adjustments" },
    { to: "/reports", label: "Reports" },
  ],
  CHECKER: [
    { to: "/", label: "Dashboard" },
    { to: "/uploads", label: "Upload Center" },
    { to: "/reconciliations", label: "Reconciliations" },
    { to: "/adjustments", label: "Adjustments" },
    { to: "/reports", label: "Reports" },
  ],
  AUDITOR: [
    { to: "/", label: "Dashboard" },
    { to: "/uploads", label: "Upload Center" },
    { to: "/reconciliations", label: "Reconciliations" },
    { to: "/reports", label: "Reports" },
    { to: "/audit", label: "Audit" },
  ],
};

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const nav = navByRole[user?.role] || [{ to: "/", label: "Dashboard" }];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-page)", color: "var(--text-primary)" }}
    >
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-sm"
        style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="md:hidden rounded-lg p-2 hover:opacity-80"
              onClick={() => setDrawerOpen((o) => !o)}
              aria-label="Menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <Link
              to="/"
              className="font-semibold text-[#0369a1] dark:text-[#38bdf8] hover:underline"
            >
              Reconciliation Platform
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="input-soft w-auto py-1.5 pr-8"
              aria-label="Theme"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
            <span
              className="hidden text-sm sm:inline"
              style={{ color: "var(--text-secondary)" }}
            >
              {user?.name || user?.email}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-90"
              style={{
                background: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 transform border-r transition-transform md:relative md:translate-x-0 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
        >
          <div
            className="flex h-14 items-center justify-between border-b px-4 md:hidden"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="font-medium">Menu</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg p-2 hover:opacity-80"
            >
              ✕
            </button>
          </div>
          <nav className="flex flex-col gap-0.5 p-3">
            {nav.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setDrawerOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  location.pathname === to
                    ? "bg-[#0369a1]/10 text-[#0369a1] dark:bg-[#38bdf8]/20 dark:text-[#38bdf8]"
                    : "hover:opacity-80"
                }`}
                style={
                  location.pathname !== to
                    ? { color: "var(--text-secondary)" }
                    : {}
                }
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

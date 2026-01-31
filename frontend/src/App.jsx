import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Users } from "./pages/Users";
import { Entities } from "./pages/Entities";
import { Masters } from "./pages/Masters";
import { GlAccounts } from "./pages/GlAccounts";
import { Periods } from "./pages/Periods";
import { Uploads } from "./pages/Uploads";
import { Reconciliations } from "./pages/Reconciliations";
import { ReconciliationDetail } from "./pages/ReconciliationDetail";
import { Adjustments } from "./pages/Adjustments";
import { Reports } from "./pages/Reports";
import { Audit } from "./pages/Audit";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, retry: 1 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route
                  path="users"
                  element={
                    <ProtectedRoute
                      allowedRoles={["APP_ADMINISTRATOR", "ADMIN"]}
                    >
                      <Users />
                    </ProtectedRoute>
                  }
                />
                <Route path="entities" element={<Entities />} />
                <Route path="masters" element={<Masters />} />
                <Route path="gl-accounts" element={<GlAccounts />} />
                <Route path="periods" element={<Periods />} />
                <Route path="uploads" element={<Uploads />} />
                <Route path="reconciliations" element={<Reconciliations />} />
                <Route
                  path="reconciliations/:id"
                  element={<ReconciliationDetail />}
                />
                <Route path="adjustments" element={<Adjustments />} />
                <Route path="reports" element={<Reports />} />
                <Route
                  path="audit"
                  element={
                    <ProtectedRoute
                      allowedRoles={["APP_ADMINISTRATOR", "ADMIN", "AUDITOR"]}
                    >
                      <Audit />
                    </ProtectedRoute>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

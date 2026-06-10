import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";

import { AuthenticatedLayout } from "./layouts/AuthenticatedLayout";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ImportPage } from "./pages/ImportPage";
import { IndexRedirect } from "./pages/IndexRedirect";
import { ModerationPage } from "./pages/ModerationPage";
import { NewSalePage } from "./pages/NewSalePage";
import { PendingPage } from "./pages/PendingPage";
import { SaleDetailPage } from "./pages/SaleDetailPage";
import { SalesListPage } from "./pages/SalesListPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UsersPage } from "./pages/UsersPage";
import { useAuth } from "./lib/auth-context";

const STAFF_ROLES = ["superuser", "admin", "moderator"];

function RequireRole({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "superuser" || roles.includes(user.role)
    ? <>{children}</>
    : <Navigate to="/analytics" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexRedirect />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/pending" element={<PendingPage />} />
      <Route element={<AuthenticatedLayout />}>
        <Route path="/dashboard" element={<RequireRole roles={STAFF_ROLES}><DashboardPage /></RequireRole>} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/sales" element={<SalesListPage />} />
        <Route path="/sales/new" element={<NewSalePage />} />
        <Route path="/sales/:id" element={<SaleDetailPage />} />
        <Route path="/import" element={<RequireRole roles={STAFF_ROLES}><ImportPage /></RequireRole>} />
        <Route path="/moderation" element={<ModerationPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

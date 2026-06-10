import { Navigate, Route, Routes } from "react-router-dom";

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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexRedirect />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/pending" element={<PendingPage />} />
      <Route element={<AuthenticatedLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/sales" element={<SalesListPage />} />
        <Route path="/sales/new" element={<NewSalePage />} />
        <Route path="/sales/:id" element={<SaleDetailPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/moderation" element={<ModerationPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

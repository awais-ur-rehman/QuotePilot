import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import LandingPage from "./pages/LandingPage";
import OverviewPage from "./pages/OverviewPage";
import RequestsPage from "./pages/RequestsPage";
import NewRFQPage from "./pages/NewRFQPage";
import RFQDetailPage from "./pages/RFQDetailPage";
import VendorsPage from "./pages/VendorsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/landing" element={<LandingPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/rfqs" element={<RequestsPage />} />
          <Route path="/rfq/new" element={<NewRFQPage />} />
          <Route path="/rfq/:id" element={<RFQDetailPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

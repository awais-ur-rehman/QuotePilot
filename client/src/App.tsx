import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import DashboardPage from "./pages/DashboardPage";
import NewRFQPage from "./pages/NewRFQPage";
import RFQDetailPage from "./pages/RFQDetailPage";
import VendorsPage from "./pages/VendorsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/rfq/new" element={<NewRFQPage />} />
          <Route path="/rfq/:id" element={<RFQDetailPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

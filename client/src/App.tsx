import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Pages — to be built Day 3
const DashboardPage = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-teal-400 font-mono mb-2">QuotePilot</h1>
      <p className="text-slate-400">Autonomous Multi-Vendor RFQ Agent</p>
      <p className="text-slate-600 text-sm mt-4 font-mono">Backend foundation ready. Day 3: UI coming soon.</p>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppShell() {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

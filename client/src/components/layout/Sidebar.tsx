import { NavLink } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "◈" },
  { to: "/rfq/new", label: "New RFQ", icon: "+" },
  { to: "/vendors", label: "Vendors", icon: "⬡" },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="text-teal-400 text-xl font-mono font-bold">▶</span>
          <div>
            <div className="text-sm font-bold text-white tracking-wide">QuotePilot</div>
            <div className="text-xs text-slate-500 font-mono">v1.0 · TinyFish</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-teal-400/10 text-teal-400 border border-teal-400/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`
            }
          >
            <span className="font-mono text-base w-5 text-center">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="text-xs text-slate-600 font-mono">
          <div>TinyFish Hackathon</div>
          <div>Mar 29, 2026</div>
        </div>
      </div>
    </aside>
  );
}

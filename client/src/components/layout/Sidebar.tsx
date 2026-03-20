import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useProfile } from "../../hooks/useProfile";
import ProfileSetupModal from "../common/ProfileSetupModal";

const NAV = [
  { to: "/", label: "Dashboard", icon: "⊞" },
  { to: "/rfq/new", label: "New RFQ", icon: "+" },
  { to: "/vendors", label: "Vendors", icon: "⬡" },
];

function Initials({ name, company }: { name?: string; company?: string }) {
  const src = name || company || "?";
  const letters = src
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="w-8 h-8 rounded-full bg-teal-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
      {letters || "?"}
    </div>
  );
}

export default function Sidebar() {
  const { profile, saveProfile } = useProfile();
  const [editingProfile, setEditingProfile] = useState(false);

  return (
    <>
      <aside className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[5px] bg-teal-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">QP</span>
            </div>
            <span className="text-sm font-semibold text-slate-900">QuotePilot</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "nav-item-active" : ""}`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active left bar */}
                  <span
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full h-4 transition-opacity ${
                      isActive ? "bg-teal-600 opacity-100" : "opacity-0"
                    }`}
                  />
                  <span className="text-base w-5 text-center leading-none select-none">{icon}</span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Profile section */}
        <div className="px-3 py-3 border-t border-slate-200">
          {profile ? (
            <button
              onClick={() => setEditingProfile(true)}
              className="w-full flex items-center gap-2.5 p-2 rounded-[6px] hover:bg-slate-50 transition-colors text-left"
            >
              <Initials name={profile.contactName} company={profile.companyName} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {profile.companyName}
                </div>
                <div className="text-[11px] text-slate-500 truncate">{profile.contactName || profile.email}</div>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">Edit</span>
            </button>
          ) : (
            <button
              onClick={() => setEditingProfile(true)}
              className="w-full flex items-center gap-2.5 p-2 rounded-[6px] border border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                ?
              </div>
              <div className="text-xs text-slate-500">Set up profile</div>
            </button>
          )}
        </div>
      </aside>

      {editingProfile && (
        <ProfileSetupModal
          initial={profile}
          onSave={(p) => { saveProfile(p); setEditingProfile(false); }}
          onClose={() => setEditingProfile(false)}
        />
      )}
    </>
  );
}

import { useState } from "react";
import toast from "react-hot-toast";
import Header from "../components/layout/Header";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { useProfile } from "../hooks/useProfile";
import type { Profile } from "../context/ProfileContext";

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[6px] overflow-hidden"
         style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

// ─── Profile Section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { profile, saveProfile } = useProfile();
  const [form, setForm] = useState<Profile>({
    companyName: profile?.companyName ?? "",
    contactName: profile?.contactName ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.companyName || !form.email) {
      toast.error("Company name and email are required.");
      return;
    }
    setSaving(true);
    try {
      saveProfile(form);
      toast.success("Profile updated");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Profile">
      <div className="space-y-4 max-w-lg">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Company name *</label>
            <input className="input" placeholder="Acme Corp" value={form.companyName} onChange={set("companyName")} />
          </div>
          <div>
            <label className="label">Contact name</label>
            <input className="input" placeholder="Jane Smith" value={form.contactName} onChange={set("contactName")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" placeholder="jane@acme.com" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" placeholder="+1 555 000 0000" value={form.phone} onChange={set("phone")} />
          </div>
        </div>
        <div>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-xs px-4 py-2">
            {saving ? "Saving…" : "Update Profile"}
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Agent Preferences ────────────────────────────────────────────────────────

function PreferencesSection() {
  const [defaultProfile, setDefaultProfile] = useState(
    localStorage.getItem("qp_pref_browser") ?? "lite"
  );
  const [autoLaunch, setAutoLaunch] = useState(
    localStorage.getItem("qp_pref_autolaunch") === "true"
  );

  const save = () => {
    localStorage.setItem("qp_pref_browser", defaultProfile);
    localStorage.setItem("qp_pref_autolaunch", String(autoLaunch));
    toast.success("Preferences saved");
  };

  return (
    <SectionCard title="Agent Preferences">
      <div className="space-y-4 max-w-lg">
        <div>
          <label className="label">Default browser profile</label>
          <select
            className="input max-w-xs"
            value={defaultProfile}
            onChange={(e) => setDefaultProfile(e.target.value)}
          >
            <option value="lite">Lite — fast, default</option>
            <option value="stealth">Stealth — anti-bot bypass</option>
          </select>
          <p className="text-[11px] text-slate-400 mt-1">Used for new vendors unless overridden on the vendor profile.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            role="switch"
            aria-checked={autoLaunch}
            onClick={() => setAutoLaunch((v) => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${autoLaunch ? "bg-teal-600" : "bg-slate-200"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoLaunch ? "translate-x-4" : "translate-x-0"}`} />
          </button>
          <div>
            <div className="text-sm font-medium text-slate-700">Auto-launch agents</div>
            <div className="text-[11px] text-slate-400">Automatically dispatch agents when creating a new RFQ.</div>
          </div>
        </div>

        <button onClick={save} className="btn-primary text-xs px-4 py-2">
          Save Preferences
        </button>
      </div>
    </SectionCard>
  );
}

// ─── Data Management ──────────────────────────────────────────────────────────

function DataSection() {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleExport = () => {
    const profile = localStorage.getItem("qp_profile");
    const prefs = {
      browser: localStorage.getItem("qp_pref_browser"),
      autoLaunch: localStorage.getItem("qp_pref_autolaunch"),
    };
    const data = { profile: profile ? JSON.parse(profile) : null, preferences: prefs };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quotepilot-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Settings exported");
  };

  const handleClearLocal = () => {
    localStorage.removeItem("qp_profile");
    localStorage.removeItem("qp_pref_browser");
    localStorage.removeItem("qp_pref_autolaunch");
    setShowClearConfirm(false);
    toast.success("Local settings cleared — reload to reset");
  };

  return (
    <>
      <SectionCard title="Data">
        <div className="space-y-4 max-w-lg">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <div className="text-sm font-medium text-slate-700">Export settings</div>
              <div className="text-[11px] text-slate-400">Download your profile and preferences as JSON.</div>
            </div>
            <button onClick={handleExport} className="btn-secondary text-xs px-3 py-1.5">
              Export JSON
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium text-red-600">Clear local settings</div>
              <div className="text-[11px] text-slate-400">Remove profile and preferences stored in this browser.</div>
            </div>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs px-3 py-1.5 rounded-[6px] font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </SectionCard>

      {showClearConfirm && (
        <ConfirmDialog
          title="Clear local settings"
          message="This will remove your profile and preferences from this browser. RFQ data in the database is not affected."
          confirmLabel="Clear Settings"
          danger
          onConfirm={handleClearLocal}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Settings" subtitle="Profile & preferences" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-5">
          <ProfileSection />
          <PreferencesSection />
          <DataSection />
        </div>
      </div>
    </div>
  );
}

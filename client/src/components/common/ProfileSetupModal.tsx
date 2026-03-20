import { useState } from "react";
import type { Profile } from "../../hooks/useProfile";

interface ProfileSetupModalProps {
  onSave: (profile: Profile) => void;
  initial?: Profile | null;
  onClose?: () => void;
}

export default function ProfileSetupModal({ onSave, initial, onClose }: ProfileSetupModalProps) {
  const [form, setForm] = useState<Profile>({
    companyName: initial?.companyName ?? "",
    contactName: initial?.contactName ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = () => {
    if (!form.companyName.trim() || !form.email.trim()) {
      setError("Company name and email are required.");
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-[6px] border border-slate-200 w-full max-w-md mx-4 p-6 space-y-5"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Your contact profile</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Saved locally — auto-fills every RFQ you create.
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl leading-none ml-4 mt-0.5"
            >
              ×
            </button>
          )}
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div>
            <label className="label">Company name *</label>
            <input
              className="input"
              placeholder="Acme Corp"
              value={form.companyName}
              onChange={set("companyName")}
              autoFocus
            />
          </div>

          <div>
            <label className="label">Your name</label>
            <input
              className="input"
              placeholder="Jane Smith"
              value={form.contactName}
              onChange={set("contactName")}
            />
          </div>

          <div>
            <label className="label">Email *</label>
            <input
              className="input"
              type="email"
              placeholder="jane@acme.com"
              value={form.email}
              onChange={set("email")}
            />
          </div>

          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              placeholder="+1 555 000 0000"
              value={form.phone}
              onChange={set("phone")}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button onClick={handleSave} className="btn-primary w-full">
          Save profile
        </button>
      </div>
    </div>
  );
}

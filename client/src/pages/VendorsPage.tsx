import { useState, useEffect, useCallback } from "react";
import { vendorApi } from "../services/api";
import Header from "../components/layout/Header";
import type { Vendor } from "../types";

function VendorFormModal({
  vendor,
  onClose,
  onSave,
}: {
  vendor?: Vendor | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: vendor?.name ?? "",
    website: vendor?.website ?? "",
    quoteUrl: vendor?.quoteUrl ?? "",
    category: vendor?.category ?? "general",
    formInstructions: vendor?.formInstructions ?? "",
    browserProfile: vendor?.browserProfile ?? "lite",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (vendor) {
        await vendorApi.update(vendor._id, form as Partial<Vendor>);
      } else {
        await vendorApi.create({ ...form, isActive: true } as Omit<Vendor, "_id" | "reliability" | "avgSteps" | "createdAt" | "updatedAt">);
      }
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="card w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            {vendor ? "Edit Vendor" : "Add Vendor"}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={set("name")} />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={set("category")} />
          </div>
        </div>

        <div>
          <label className="label">Website</label>
          <input className="input" placeholder="https://example.com" value={form.website} onChange={set("website")} />
        </div>

        <div>
          <label className="label">Quote URL (where agent should start)</label>
          <input className="input" placeholder="https://example.com/get-quote" value={form.quoteUrl} onChange={set("quoteUrl")} />
        </div>

        <div>
          <label className="label">Browser Profile</label>
          <select className="input" value={form.browserProfile} onChange={set("browserProfile")}>
            <option value="lite">lite (default)</option>
            <option value="stealth">stealth (anti-bot)</option>
          </select>
        </div>

        <div>
          <label className="label">Form Instructions (hints for the agent)</label>
          <textarea
            className="input resize-none h-24"
            placeholder="Special instructions for navigating this vendor's form..."
            value={form.formInstructions}
            onChange={set("formInstructions")}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving…" : "Save Vendor"}
          </button>
          <button onClick={onClose} className="btn-secondary px-4">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function VendorCard({
  vendor,
  onEdit,
  onDelete,
}: {
  vendor: Vendor;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-200">{vendor.name}</h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
              vendor.browserProfile === "stealth"
                ? "bg-amber-400/10 text-amber-400"
                : "bg-slate-700 text-slate-400"
            }`}>
              {vendor.browserProfile}
            </span>
          </div>
          <a
            href={vendor.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-teal-400/70 hover:text-teal-400 font-mono truncate block"
          >
            {vendor.website}
          </a>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="text-xs text-slate-500 hover:text-slate-200 px-2 py-1">
            Edit
          </button>
          <button onClick={onDelete} className="text-xs text-slate-500 hover:text-red-400 px-2 py-1">
            Del
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
        <div>
          <span className="text-slate-600">Category</span>{" "}
          <span className="text-slate-400">{vendor.category}</span>
        </div>
        <div>
          <span className="text-slate-600">Reliability</span>{" "}
          <span className={vendor.reliability >= 80 ? "text-green-400" : vendor.reliability >= 50 ? "text-amber-400" : "text-red-400"}>
            {vendor.reliability}%
          </span>
        </div>
        {vendor.avgSteps > 0 && (
          <div>
            <span className="text-slate-600">Avg steps</span>{" "}
            <span className="text-slate-400">{vendor.avgSteps}</span>
          </div>
        )}
      </div>

      {vendor.formInstructions && (
        <p className="text-xs text-slate-600 line-clamp-2">{vendor.formInstructions}</p>
      )}
    </div>
  );
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Vendor | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await vendorApi.list();
    setVendors((res.data as Vendor[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this vendor?")) return;
    await vendorApi.delete(id);
    load();
  };

  const handleEdit = (v: Vendor) => {
    setEditTarget(v);
    setShowModal(true);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Vendors"
        subtitle={`${vendors.length} active vendor${vendors.length !== 1 ? "s" : ""}`}
        actions={
          <button onClick={() => { setEditTarget(null); setShowModal(true); }} className="btn-primary text-xs px-3 py-1.5">
            + Add Vendor
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <p className="text-sm text-slate-500 font-mono animate-pulse">Loading vendors…</p>
        )}

        {!loading && vendors.length === 0 && (
          <div className="text-center py-20">
            <p className="text-sm text-slate-500 mb-4">No vendors yet. Run the seed script or add one manually.</p>
            <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
              Add First Vendor
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {vendors.map((v) => (
            <VendorCard
              key={v._id}
              vendor={v}
              onEdit={() => handleEdit(v)}
              onDelete={() => handleDelete(v._id)}
            />
          ))}
        </div>
      </div>

      {showModal && (
        <VendorFormModal
          vendor={editTarget}
          onClose={() => setShowModal(false)}
          onSave={load}
        />
      )}
    </div>
  );
}

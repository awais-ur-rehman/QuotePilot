import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { vendorApi } from "../services/api";
import Header from "../components/layout/Header";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";
import type { Vendor } from "../types";

// ─── Slide-in Panel ───────────────────────────────────────────────────────────

function VendorPanel({
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
    if (!form.name || !form.quoteUrl) {
      setError("Name and quote URL are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (vendor) {
        await vendorApi.update(vendor._id, form as Partial<Vendor>);
        toast.success("Vendor updated");
      } else {
        await vendorApi.create({ ...form, isActive: true } as Omit<Vendor, "_id" | "reliability" | "avgSteps" | "createdAt" | "updatedAt">);
        toast.success("Vendor added");
      }
      onSave();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setError(msg);
      toast.error(msg);
      setSaving(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-96 bg-white border-l border-slate-200 flex flex-col animate-slide-right"
           style={{ boxShadow: "-4px 0 20px rgba(0,0,0,0.08)" }}>
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            {vendor ? "Edit Vendor" : "Add Vendor"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.name} onChange={set("name")} placeholder="Vendor Co." />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="input" value={form.category} onChange={set("category")} placeholder="packaging" />
            </div>
          </div>

          <div>
            <label className="label">Website</label>
            <input className="input" placeholder="https://example.com" value={form.website} onChange={set("website")} />
          </div>

          <div>
            <label className="label">Quote URL *</label>
            <input className="input" placeholder="https://example.com/get-quote" value={form.quoteUrl} onChange={set("quoteUrl")} />
            <p className="text-[11px] text-slate-400 mt-1">The page where the agent should start the quote flow.</p>
          </div>

          <div>
            <label className="label">Browser profile</label>
            <select className="input" value={form.browserProfile} onChange={set("browserProfile")}>
              <option value="lite">lite — default, fast</option>
              <option value="stealth">stealth — anti-bot bypass</option>
            </select>
          </div>

          <div>
            <label className="label">Agent instructions</label>
            <textarea
              className="input resize-none h-28"
              placeholder="Tips for navigating this vendor's form (optional)..."
              value={form.formInstructions}
              onChange={set("formInstructions")}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Panel footer */}
        <div className="px-5 py-4 border-t border-slate-200 flex gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving…" : "Save Vendor"}
          </button>
          <button onClick={onClose} className="btn-secondary px-4">Cancel</button>
        </div>
      </div>
    </>
  );
}

// ─── Vendor Row ───────────────────────────────────────────────────────────────

function VendorRow({
  vendor,
  onEdit,
  onDelete,
}: {
  vendor: Vendor;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const reliabilityColor =
    vendor.reliability >= 80 ? "text-green-700 bg-green-50" :
    vendor.reliability >= 50 ? "text-amber-700 bg-amber-50" :
    "text-red-700 bg-red-50";

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      {/* Name + URL */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-slate-800">{vendor.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
            vendor.browserProfile === "stealth"
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "bg-slate-100 text-slate-500"
          }`}>
            {vendor.browserProfile}
          </span>
        </div>
        <a
          href={vendor.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-teal-600 hover:text-teal-700 font-mono truncate block max-w-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {vendor.website}
        </a>
      </div>

      {/* Category */}
      <div className="w-28 text-xs text-slate-500 truncate">{vendor.category}</div>

      {/* Reliability */}
      <div className="w-20 flex items-center gap-1.5">
        <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              vendor.reliability >= 80 ? "bg-green-500" :
              vendor.reliability >= 50 ? "bg-amber-500" : "bg-red-500"
            }`}
            style={{ width: `${vendor.reliability}%` }}
          />
        </div>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${reliabilityColor}`}>
          {vendor.reliability}%
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="btn-ghost text-xs py-1 px-2">Edit</button>
        <button onClick={onDelete} className="btn-ghost text-xs py-1 px-2 text-red-500 hover:bg-red-50 hover:text-red-600">
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [editTarget, setEditTarget] = useState<Vendor | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await vendorApi.list();
    setVendors((res.data as Vendor[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await vendorApi.delete(confirmDeleteId);
      setConfirmDeleteId(null);
      load();
      toast.success("Vendor deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete vendor");
    } finally {
      setDeleting(false);
    }
  };

  const openAdd = () => { setEditTarget(null); setShowPanel(true); };
  const openEdit = (v: Vendor) => { setEditTarget(v); setShowPanel(true); };
  const closePanel = () => { setShowPanel(false); setEditTarget(null); };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Vendors"
        subtitle={`${vendors.length} active`}
        actions={
          <button onClick={openAdd} className="btn-primary text-xs px-3 py-1.5">
            + Add Vendor
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {loading && (
            <p className="text-sm text-slate-400 font-mono animate-pulse">Loading vendors…</p>
          )}

          {!loading && vendors.length === 0 && (
            <EmptyState
              title="No vendors yet"
              description="Add your first vendor or run the seed script to get started."
              icon="⬡"
            />
          )}

          {!loading && vendors.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-[6px] overflow-hidden"
                 style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              {/* Table header */}
              <div className="flex items-center gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-200">
                <div className="flex-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendor</div>
                <div className="w-28 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</div>
                <div className="w-20 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reliability</div>
                <div className="w-28" />
              </div>
              {vendors.map((v) => (
                <VendorRow
                  key={v._id}
                  vendor={v}
                  onEdit={() => openEdit(v)}
                  onDelete={() => setConfirmDeleteId(v._id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showPanel && (
        <VendorPanel
          vendor={editTarget}
          onClose={closePanel}
          onSave={load}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete vendor"
          message="This will permanently remove the vendor. Existing quotes referencing this vendor will still be visible."
          confirmLabel={deleting ? "Deleting…" : "Delete"}
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}

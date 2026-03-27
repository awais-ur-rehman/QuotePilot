import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { vendorApi, discoveryApi } from "../services/api";
import Header from "../components/layout/Header";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";
import type { Vendor, DiscoveryRun, DiscoveredVendor } from "../types";

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
    formInstructions: vendor?.formInstructions ?? "",
    browserProfile: vendor?.browserProfile ?? "lite",
  });
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(vendor?.tags ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (tag && !tags.includes(tag)) setTags((t) => [...t, tag]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags((t) => t.filter((x) => x !== tag));

  const handleSave = async () => {
    if (!form.name || !form.quoteUrl) {
      setError("Name and quote URL are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (vendor) {
        await vendorApi.update(vendor._id, { ...form, tags } as Partial<Vendor>);
        toast.success("Vendor updated");
      } else {
        await vendorApi.create({ ...form, tags, isActive: true } as Omit<Vendor, "_id" | "reliability" | "avgSteps" | "createdAt" | "updatedAt">);
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
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={set("name")} placeholder="Vendor Co." />
          </div>

          <div>
            <label className="label">Tags</label>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-700 rounded font-mono">
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="text-teal-400 hover:text-teal-700 leading-none">×</button>
                </span>
              ))}
            </div>
            <input
              className="input text-xs"
              placeholder="Type a tag and press Enter (e.g. packaging)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }}}
              onBlur={() => tagInput.trim() && addTag(tagInput)}
            />
            <p className="text-[11px] text-slate-400 mt-1">Press Enter or comma to add a tag.</p>
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

// ─── Trust Badge ─────────────────────────────────────────────────────────────

function TrustBadge({ vendor, onRecheck }: { vendor: Vendor; onRecheck?: () => void }) {
  if (vendor.trustStatus === "checking") {
    return <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded font-mono animate-pulse">Checking…</span>;
  }
  if (vendor.trustScore == null) {
    if (!onRecheck) return null;
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onRecheck(); }}
        className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded font-mono hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200 transition-colors"
      >
        Check trust
      </button>
    );
  }
  const color = vendor.trustScore >= 80 ? "bg-green-50 text-green-700 border-green-200"
    : vendor.trustScore >= 60 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";
  const hasSubs = vendor.trustData?.bbbRating || vendor.trustData?.trustpilotScore != null || vendor.trustData?.googleRating != null;
  return (
    <span className="relative group">
      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-semibold cursor-default ${color}`}>
        ★ {vendor.trustScore}/100
      </span>
      {/* Tooltip */}
      {(hasSubs || onRecheck) && (
        <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-20 pointer-events-none group-hover:pointer-events-auto">
          <div className="bg-slate-900 text-white text-[10px] rounded-[6px] p-2.5 shadow-xl font-mono whitespace-nowrap space-y-1 min-w-[140px]"
               style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
            {vendor.trustData?.bbbRating && (
              <div>BBB: {vendor.trustData.bbbRating}{vendor.trustData.bbbAccredited ? " ✓ accredited" : ""}</div>
            )}
            {vendor.trustData?.trustpilotScore != null && (
              <div>Trustpilot: {vendor.trustData.trustpilotScore} ★</div>
            )}
            {vendor.trustData?.googleRating != null && (
              <div>Google: {vendor.trustData.googleRating} ★</div>
            )}
            {onRecheck && (
              <button
                onClick={(e) => { e.stopPropagation(); onRecheck(); }}
                className="text-teal-400 hover:text-teal-300 mt-1 block transition-colors"
              >
                ↺ Recheck trust
              </button>
            )}
          </div>
        </div>
      )}
    </span>
  );
}

// ─── Discovery Detail Panel ───────────────────────────────────────────────────

function DiscoveryDetailPanel({
  vendor,
  runSource,
  onClose,
  onAdded,
}: {
  vendor: DiscoveredVendor;
  runSource: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({
    name: vendor.name ?? "",
    website: vendor.website ?? "",
    quoteUrl: vendor.quoteUrl ?? "",
    browserProfile: "lite" as "lite" | "stealth",
  });
  const [tags, setTags] = useState<string[]>(vendor.category ? [vendor.category.toLowerCase()] : []);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (tag && !tags.includes(tag)) setTags((t) => [...t, tag]);
    setTagInput("");
  };
  const removeTag = (tag: string) => setTags((t) => t.filter((x) => x !== tag));

  const handleAdd = async () => {
    if (!form.name || !form.quoteUrl) {
      setError("Name and Quote URL are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await vendorApi.create({
        name: form.name,
        website: form.website,
        quoteUrl: form.quoteUrl,
        browserProfile: form.browserProfile,
        tags,
        isActive: true,
        discoveredFrom: runSource,
      } as Parameters<typeof vendorApi.create>[0]);
      toast.success("Vendor added to catalog");
      onAdded();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add vendor";
      setError(msg);
      toast.error(msg);
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-96 bg-white border-l border-slate-200 flex flex-col animate-slide-right"
           style={{ boxShadow: "-4px 0 20px rgba(0,0,0,0.08)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Review Discovered Vendor</h2>
            <p className="text-xs text-slate-400 mt-0.5">Verify details before adding to catalog</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] px-2 py-1 rounded border font-mono ${
              runSource === "google" ? "bg-blue-50 text-blue-700 border-blue-200" :
              runSource === "thomasnet" ? "bg-orange-50 text-orange-700 border-orange-200" :
              "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              via {runSource}
            </span>
            {vendor.hasOnlineForm && (
              <span className="text-[10px] text-green-600 font-medium">✓ Online quote form detected</span>
            )}
          </div>

          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={set("name")} placeholder="Vendor name" />
          </div>

          <div>
            <label className="label">Website</label>
            <input className="input" value={form.website} onChange={set("website")} placeholder="https://example.com" />
          </div>

          <div>
            <label className="label">Quote URL *</label>
            <input className="input" value={form.quoteUrl} onChange={set("quoteUrl")} placeholder="https://example.com/get-quote" />
            <p className="text-[11px] text-slate-400 mt-1">The agent starts here. Update if the auto-detected URL looks wrong.</p>
          </div>

          <div>
            <label className="label">Tags</label>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-700 rounded font-mono">
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="text-teal-400 hover:text-teal-700 leading-none">×</button>
                </span>
              ))}
            </div>
            <input
              className="input text-xs"
              placeholder="Add tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }}}
              onBlur={() => tagInput.trim() && addTag(tagInput)}
            />
          </div>

          <div>
            <label className="label">Browser profile</label>
            <select className="input" value={form.browserProfile} onChange={set("browserProfile") as React.ChangeEventHandler<HTMLSelectElement>}>
              <option value="lite">lite — default, fast</option>
              <option value="stealth">stealth — anti-bot bypass</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex gap-3">
          <button onClick={handleAdd} disabled={saving} className="btn-primary flex-1">
            {saving ? "Adding…" : "Add to Catalog"}
          </button>
          <button onClick={onClose} className="btn-secondary px-4">Cancel</button>
        </div>
      </div>
    </>
  );
}

// ─── Discover Panel ───────────────────────────────────────────────────────────

function DiscoverPanel({ onVendorAdded }: { onVendorAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [sources, setSources] = useState<Set<string>>(new Set(["google"]));
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DiscoveryRun[]>([]);
  const [addedIndices, setAddedIndices] = useState<Set<string>>(new Set());
  const [pendingVendor, setPendingVendor] = useState<{ vendor: DiscoveredVendor; runSource: string; key: string } | null>(null);

  const toggleSource = (s: string) => setSources((prev) => {
    const next = new Set(prev);
    if (next.has(s)) { if (next.size > 1) next.delete(s); } else next.add(s);
    return next;
  });

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setSearching(true);
    setResults([]);
    setAddedIndices(new Set());
    try {
      const res = await discoveryApi.search(keyword.trim(), [...sources]);
      setResults((res.data as DiscoveryRun[]) ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setSearching(false);
    }
  };

  const handleOpenDetail = (run: DiscoveryRun, idx: number, vendor: DiscoveredVendor) => {
    setPendingVendor({ vendor, runSource: run.source, key: `${run._id}-${idx}` });
  };

  const handleDetailAdded = (key: string) => {
    setAddedIndices((prev) => new Set([...prev, key]));
    onVendorAdded();
    setPendingVendor(null);
  };

  const allVendors: Array<{ run: DiscoveryRun; idx: number; vendor: DiscoveredVendor }> = results.flatMap((run) =>
    run.vendorsFound.map((v, idx) => ({ run, idx, vendor: v }))
  );

  return (
    <div className="border border-slate-200 rounded-[6px] bg-white mb-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800">Discover Vendors</span>
          <span className="text-[10px] text-slate-400">AI-powered supplier discovery</span>
        </div>
        <span className="text-slate-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-slate-200 px-5 py-4">
          <div className="flex gap-3 mb-3">
            <input
              className="input flex-1"
              placeholder="Product keyword (e.g. custom corrugated boxes)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            />
            <div className="flex items-center gap-2 shrink-0">
              {(["google", "thomasnet", "alibaba"] as const).map((s) => (
                <label key={s} className="flex items-center gap-1 cursor-pointer select-none">
                  <input type="checkbox" checked={sources.has(s)} onChange={() => toggleSource(s)} className="accent-teal-600" />
                  <span className="text-xs text-slate-600 capitalize">{s}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !keyword.trim()}
              className="btn-primary text-xs px-4 disabled:opacity-50"
            >
              {searching ? "Searching…" : "Search →"}
            </button>
          </div>

          {searching && (
            <p className="text-xs text-slate-400 font-mono animate-pulse">Agents searching the web for suppliers…</p>
          )}

          {allVendors.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {allVendors.map(({ run, idx, vendor: v }) => {
                const key = `${run._id}-${idx}`;
                const added = addedIndices.has(key) || v.addedToRegistry;
                return (
                  <div key={key} className="border border-slate-200 rounded-[6px] p-3 bg-slate-50 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{v.name}</p>
                        {v.website && (
                          <a href={v.website} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-teal-600 hover:text-teal-700 font-mono truncate block">
                            {v.website}
                          </a>
                        )}
                        {v.quoteUrl && v.quoteUrl !== v.website && (
                          <p className="text-[9px] text-slate-400 font-mono truncate" title={v.quoteUrl}>
                            Quote: {v.quoteUrl}
                          </p>
                        )}
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono shrink-0 ${
                        run.source === "google" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        run.source === "thomasnet" ? "bg-orange-50 text-orange-700 border-orange-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>{run.source}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                        {v.category && <span className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">{v.category}</span>}
                        {v.hasOnlineForm && <span className="text-green-600">✓ Online form</span>}
                        {!v.quoteUrl && <span className="text-amber-600">No quote URL</span>}
                      </div>
                      <button
                        onClick={() => !added && handleOpenDetail(run, idx, v)}
                        disabled={added}
                        className={`text-[10px] px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                          added
                            ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                            : "bg-teal-600 text-white hover:bg-teal-700"
                        }`}
                      >
                        {added ? "✓ Added" : "Review →"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pendingVendor && (
            <DiscoveryDetailPanel
              vendor={pendingVendor.vendor}
              runSource={pendingVendor.runSource}
              onClose={() => setPendingVendor(null)}
              onAdded={() => handleDetailAdded(pendingVendor.key)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Vendor Row ───────────────────────────────────────────────────────────────

function VendorRow({
  vendor,
  onEdit,
  onDelete,
  onRecheck,
}: {
  vendor: Vendor;
  onEdit: () => void;
  onDelete: () => void;
  onRecheck: () => void;
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
          <TrustBadge vendor={vendor} onRecheck={onRecheck} />
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
        {vendor.trustData?.bbbRating && (
          <span className="text-[9px] text-slate-400 font-mono">
            BBB: {vendor.trustData.bbbRating}{vendor.trustData.bbbAccredited ? " ✓" : ""}
            {vendor.trustData.trustpilotScore != null && ` · Trustpilot: ${vendor.trustData.trustpilotScore}★`}
          </span>
        )}
      </div>

      {/* Tags */}
      <div className="w-28 flex flex-wrap gap-1">
        {(vendor.tags ?? []).slice(0, 2).map((t) => (
          <span key={t} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">{t}</span>
        ))}
        {vendor.discoveredFrom && (
          <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-mono">{vendor.discoveredFrom}</span>
        )}
      </div>

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

  const handleCheckTrust = async (vendorId: string) => {
    try {
      await vendorApi.checkTrust(vendorId);
      load();
      toast.success("Trust check started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start trust check");
    }
  };

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
          <DiscoverPanel onVendorAdded={load} />

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
                  onRecheck={() => handleCheckTrust(v._id)}
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

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import type { Vendor } from "../../types";

interface VendorPickerProps {
  vendors: Vendor[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

export default function VendorPicker({ vendors, selected, onChange }: VendorPickerProps) {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => v.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [vendors]);

  const filtered = useMemo(() => {
    let list = vendors;
    if (tagFilter !== "all") list = list.filter((v) => v.tags?.includes(tagFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [vendors, tagFilter, search]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  };

  const selectAllVisible = () => {
    const next = new Set(selected);
    filtered.forEach((v) => next.add(v._id));
    onChange(next);
  };

  const clearAll = () => onChange(new Set());

  // 0 vendors: guide user
  if (vendors.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-[6px] px-4 py-5 text-center">
        <p className="text-sm font-medium text-amber-800 mb-1">No vendors in your catalog</p>
        <p className="text-xs text-amber-700 mb-3">Add vendors before creating an RFQ.</p>
        <Link to="/vendors" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
          Go to Vendors →
        </Link>
      </div>
    );
  }

  // 1-5 vendors: simple list
  if (vendors.length <= 5 && allTags.length <= 1) {
    return (
      <SimpleVendorList vendors={vendors} selected={selected} toggle={toggle} />
    );
  }

  // 6+ vendors: smart picker
  return (
    <div className="border border-slate-200 rounded-[6px] overflow-hidden">
      {/* Search */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-100">
        <input
          className="input text-xs py-1.5"
          placeholder="Search vendors…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tag pills */}
      {allTags.length > 1 && (
        <div className="px-3 py-2 flex items-center gap-1.5 flex-wrap border-b border-slate-100 bg-slate-50">
          {["all", ...allTags].map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag)}
              className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors capitalize ${
                tagFilter === tag
                  ? "bg-teal-600 text-white"
                  : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              {tag === "all" ? "All" : tag}
            </button>
          ))}
        </div>
      )}

      {/* Vendor list */}
      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <p className="text-xs text-slate-400">
              {search ? `No vendors match "${search}"` : "No vendors with this tag"}
            </p>
            {(search || tagFilter !== "all") && (
              <button
                onClick={() => { setSearch(""); setTagFilter("all"); }}
                className="text-xs text-teal-600 hover:text-teal-700 mt-1"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          filtered.map((v) => {
            const sel = selected.has(v._id);
            return (
              <button
                key={v._id}
                type="button"
                onClick={() => toggle(v._id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  sel ? "bg-teal-50" : "hover:bg-slate-50"
                }`}
              >
                {/* Checkbox */}
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  sel ? "bg-teal-600 border-teal-600" : "border-slate-300"
                }`}>
                  {sel && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-800 truncate">{v.name}</div>
                  <div className="flex gap-1 flex-wrap mt-0.5">
                    {v.tags?.map((t) => (
                      <span key={t} className="text-[9px] px-1 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">{t}</span>
                    ))}
                  </div>
                </div>

                {/* Reliability */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-10 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        v.reliability >= 80 ? "bg-green-500" :
                        v.reliability >= 50 ? "bg-amber-500" : "bg-red-400"
                      }`}
                      style={{ width: `${v.reliability}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{v.reliability}%</span>
                </div>

                {/* Browser profile */}
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                  v.browserProfile === "stealth"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {v.browserProfile}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          <span className="font-semibold text-teal-700">{selected.size}</span> of {vendors.length} selected
        </span>
        <div className="flex items-center gap-3">
          {filtered.length > 0 && filtered.some((v) => !selected.has(v._id)) && (
            <button onClick={selectAllVisible} className="text-[11px] text-teal-600 hover:text-teal-700 font-medium">
              Select all visible
            </button>
          )}
          {selected.size > 0 && (
            <button onClick={clearAll} className="text-[11px] text-slate-400 hover:text-red-500 font-medium">
              × Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Simple list for ≤5 vendors ───────────────────────────────────────────────

function SimpleVendorList({ vendors, selected, toggle }: {
  vendors: Vendor[];
  selected: Set<string>;
  toggle: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {vendors.map((v) => {
        const sel = selected.has(v._id);
        return (
          <button
            key={v._id}
            type="button"
            onClick={() => toggle(v._id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[6px] border text-left transition-all ${
              sel
                ? "bg-teal-50 border-teal-300 text-teal-800"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sel ? "bg-teal-600" : "bg-slate-300"}`} />
              <div>
                <div className="text-sm font-medium">{v.name}</div>
                <div className="flex gap-1 mt-0.5">
                  {v.tags?.map((t) => (
                    <span key={t} className="text-[9px] px-1 py-0.5 bg-slate-100 text-slate-400 rounded font-mono">{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                v.browserProfile === "stealth"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {v.browserProfile}
              </span>
              <span>{v.reliability}%</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

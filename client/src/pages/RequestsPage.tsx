import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useRFQList } from "../hooks/useRFQ";
import { rfqApi } from "../services/api";
import Header from "../components/layout/Header";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { timeAgo, formatCurrency } from "../utils/formatters";
import type { RFQ, Quote, RFQStatus } from "../types";

const FILTERS: { label: string; value: RFQStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Running", value: "running" },
  { label: "Completed", value: "completed" },
  { label: "Awarded", value: "awarded" },
  { label: "Failed", value: "failed" },
];

// ─── Vendor Dots ──────────────────────────────────────────────────────────────

function VendorDots({ rfq }: { rfq: RFQ }) {
  const quotes: Quote[] = (rfq as unknown as { quotes?: Quote[] }).quotes ?? [];
  const total = rfq.vendorIds.length;

  if (quotes.length === 0) {
    // No quotes yet — show neutral dots
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: Math.min(total, 8) }).map((_, i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-200" />
        ))}
        {total > 8 && <span className="text-[10px] text-slate-400 ml-0.5">+{total - 8}</span>}
      </div>
    );
  }

  const visible = quotes.slice(0, 8);
  const extra = quotes.length - 8;

  const dotColor = (q: Quote) => {
    if (q.status === "completed") return "bg-green-500";
    if (q.status === "running") return "bg-teal-500 animate-pulse-dot";
    if (q.status === "failed" || q.status === "no_quote") return "bg-red-400";
    return "bg-slate-300";
  };

  return (
    <div className="flex items-center gap-0.5">
      {visible.map((q) => (
        <span key={q._id} className={`w-1.5 h-1.5 rounded-full ${dotColor(q)}`} />
      ))}
      {extra > 0 && <span className="text-[10px] text-slate-400 ml-0.5">+{extra}</span>}
    </div>
  );
}

// ─── RFQ Row ──────────────────────────────────────────────────────────────────

function RFQRow({ rfq, onDelete }: { rfq: RFQ; onDelete: () => void }) {
  const quotes: Quote[] = (rfq as unknown as { quotes?: Quote[] }).quotes ?? [];
  const completedQuotes = quotes.filter((q) => q.status === "completed");
  const totalVendors = rfq.vendorIds.length;
  const progressPct = totalVendors > 0 ? (completedQuotes.length / totalVendors) * 100 : 0;
  const bestPrice = completedQuotes.length > 0
    ? Math.min(...completedQuotes.map((q) => q.unitPrice ?? Infinity))
    : null;

  return (
    <div className="relative group flex items-center border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      <Link to={`/rfq/${rfq._id}`} className="flex items-center gap-4 px-5 py-3.5 flex-1 min-w-0">
        {/* Title */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-800 group-hover:text-teal-700 truncate transition-colors">
            {rfq.title}
            {rfq.status === "awarded" && (
              <span className="ml-2 text-[10px] text-blue-600 font-semibold">★ Awarded</span>
            )}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5 truncate">
            {rfq.specs.productType} · qty {rfq.specs.quantity.toLocaleString()}
          </div>
        </div>

        {/* Vendor dots */}
        <div className="w-24 shrink-0 flex items-center gap-2">
          <VendorDots rfq={rfq} />
          <span className="text-[11px] text-slate-400 font-mono">{totalVendors}</span>
        </div>

        {/* Progress (running) */}
        {rfq.status === "running" && totalVendors > 0 && (
          <div className="w-20 shrink-0">
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5 text-right">
              {completedQuotes.length}/{totalVendors}
            </div>
          </div>
        )}

        {/* Best price (completed/awarded) */}
        {(rfq.status === "completed" || rfq.status === "awarded") && bestPrice && bestPrice !== Infinity && (
          <div className="w-24 shrink-0 text-right">
            <div className="text-xs font-mono font-semibold text-teal-700">
              {formatCurrency(bestPrice)}/unit
            </div>
            <div className="text-[10px] text-slate-400">best price</div>
          </div>
        )}

        {/* Status */}
        <div className="w-24 flex justify-end shrink-0">
          <StatusBadge status={rfq.status} />
        </div>

        {/* Date */}
        <div className="w-20 text-right text-xs text-slate-400 font-mono shrink-0">
          {timeAgo(rfq.createdAt)}
        </div>
      </Link>

      {/* Hover delete */}
      <div className="px-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.preventDefault(); onDelete(); }}
          className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RequestsPage() {
  const { rfqs, total, loading, error, refetch, loadMore, hasMore } = useRFQList();
  const [filter, setFilter] = useState<RFQStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const rfq of rfqs) {
      counts[rfq.status] = (counts[rfq.status] ?? 0) + 1;
    }
    return counts;
  }, [rfqs]);

  const visible = useMemo(() => {
    let list = rfqs;
    if (filter !== "all") list = list.filter((r) => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.specs.productType.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rfqs, filter, search]);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await rfqApi.delete(confirmDeleteId);
      setConfirmDeleteId(null);
      refetch();
      toast.success("RFQ deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Requests"
        subtitle={`${total} total`}
        actions={
          <Link to="/rfq/new" className="btn-primary text-xs px-3 py-1.5">
            + New RFQ
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-4">

          {/* Filter + search bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              {FILTERS.map(({ label, value }) => {
                const count = value === "all" ? rfqs.length : (filteredCounts[value] ?? 0);
                const active = filter === value;
                return (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`text-xs px-3 py-1.5 rounded-[6px] font-medium transition-colors ${
                      active
                        ? "bg-teal-600 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                    {count > 0 && (
                      <span className={`ml-1.5 ${active ? "text-teal-200" : "text-slate-400"}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex-1 min-w-40 max-w-64">
              <input
                className="input text-xs py-1.5"
                placeholder="Search by title or product…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="bg-white border border-slate-200 rounded-[6px] overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 animate-pulse">
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-slate-100 rounded w-48" />
                    <div className="h-2.5 bg-slate-100 rounded w-32" />
                  </div>
                  <div className="h-3 bg-slate-100 rounded w-20" />
                  <div className="h-5 bg-slate-100 rounded w-20" />
                  <div className="h-2.5 bg-slate-100 rounded w-12" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[6px] p-4">
              <p className="text-sm text-red-700">{error}</p>
              <button onClick={() => refetch()} className="text-xs text-red-600 hover:text-red-800 mt-2 underline">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && visible.length === 0 && (
            <EmptyState
              title={filter === "all" && !search ? "No RFQs yet" : `No ${filter === "all" ? "" : filter + " "}RFQs`}
              description={
                filter === "all" && !search
                  ? "Create your first RFQ to dispatch agents to vendor websites."
                  : search
                  ? `No requests match "${search}"`
                  : `No ${filter} requests right now.`
              }
              actionLabel={filter === "all" && !search ? "+ Create RFQ" : undefined}
              actionTo="/rfq/new"
              icon="≡"
            />
          )}

          {!loading && visible.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-[6px] overflow-hidden"
                 style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              {/* Table header */}
              <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-100 bg-slate-50">
                <div className="flex-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</div>
                <div className="w-24 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendors</div>
                <div className="w-24 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</div>
                <div className="w-20 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</div>
                <div className="w-14" />
              </div>
              {visible.map((rfq) => (
                <RFQRow key={rfq._id} rfq={rfq} onDelete={() => setConfirmDeleteId(rfq._id)} />
              ))}
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={loadMore}
                className="text-xs text-slate-500 hover:text-teal-700 font-medium px-4 py-2 rounded-[6px] border border-slate-200 bg-white hover:border-teal-300 transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </div>

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete RFQ"
          message="This will permanently delete the RFQ and all its quotes. This cannot be undone."
          confirmLabel={deleting ? "Deleting…" : "Delete RFQ"}
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}

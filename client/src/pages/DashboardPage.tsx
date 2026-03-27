import { Link } from "react-router-dom";
import { useState } from "react";
import toast from "react-hot-toast";
import { useRFQList } from "../hooks/useRFQ";
import { rfqApi } from "../services/api";
import { useProfile } from "../hooks/useProfile";
import Header from "../components/layout/Header";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { timeAgo } from "../utils/formatters";
import type { RFQ } from "../types";

function RFQRow({ rfq, onDelete }: { rfq: RFQ; onDelete: () => void }) {
  const quotes = rfq.quotes ?? [];
  const completedQuotes = quotes.filter((q) => (q as { status: string }).status === "completed").length;
  const totalVendors = rfq.vendorIds.length;
  const progressPct = totalVendors > 0 ? (completedQuotes / totalVendors) * 100 : 0;

  return (
    <div className="relative group flex items-center border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      <Link
        to={`/rfq/${rfq._id}`}
        className="flex items-center gap-4 px-5 py-3.5 flex-1 min-w-0"
      >
        {/* Title & specs */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-800 group-hover:text-teal-700 truncate transition-colors">
            {rfq.title}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5 truncate">
            {rfq.specs.productType} · qty {rfq.specs.quantity.toLocaleString()}
          </div>
        </div>

        {/* Progress bar (running only) */}
        {rfq.status === "running" && totalVendors > 0 && (
          <div className="w-24 shrink-0">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
              <span>{completedQuotes}/{totalVendors}</span>
            </div>
            <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Vendor count */}
        <div className="w-20 text-right text-xs text-slate-400 font-mono shrink-0">
          {totalVendors} vendor{totalVendors !== 1 ? "s" : ""}
        </div>

        {/* Status */}
        <div className="w-24 flex justify-end shrink-0">
          <StatusBadge status={rfq.status} />
        </div>

        {/* Date */}
        <div className="w-20 text-right text-xs text-slate-400 font-mono shrink-0">
          {timeAgo(rfq.createdAt)}
        </div>
      </Link>

      {/* Delete button (visible on hover) */}
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

export default function DashboardPage() {
  const { rfqs, total, loading, error, refetch, loadMore, hasMore } = useRFQList();
  const { profile } = useProfile();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const stats = {
    total: total,
    running: rfqs.filter((r) => r.status === "running").length,
    completed: rfqs.filter((r) => r.status === "completed").length,
  };

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
        title="Requests for Quote"
        actions={
          <Link to="/rfq/new" className="btn-primary text-xs px-3 py-1.5">
            + New RFQ
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-5">
          {/* Profile setup banner */}
          {(!profile?.email || !profile?.companyName) && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-[6px]">
              <div className="flex-1">
                <span className="text-sm font-medium text-amber-800">Profile not set up</span>
                <span className="text-xs text-amber-700 ml-2">— quotes won't include your contact info.</span>
              </div>
              <Link to="/settings" className="text-xs font-semibold text-teal-600 hover:text-teal-700 shrink-0 transition-colors">
                Set up profile →
              </Link>
            </div>
          )}

          {/* Stats bar */}
          <div className="flex items-center gap-3">
            {[
              { label: "Total", value: stats.total, color: "text-slate-700" },
              { label: "Running", value: stats.running, color: "text-teal-700" },
              { label: "Completed", value: stats.completed, color: "text-green-700" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-[6px]"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <span className={`text-lg font-bold font-mono ${color}`}>{value}</span>
                <span className="text-xs text-slate-500">{label}</span>
              </div>
            ))}
          </div>

          {/* Content */}
          {loading && (
            <div className="text-sm text-slate-400 font-mono animate-pulse py-4">Loading…</div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[6px] p-4">
              <p className="text-sm text-red-700">{error}</p>
              <button onClick={() => refetch()} className="text-xs text-red-600 hover:text-red-800 mt-2 underline">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && rfqs.length === 0 && (
            <EmptyState
              title="No RFQs yet"
              description="Create your first RFQ to dispatch agents to vendor websites and collect quotes automatically."
              actionLabel="+ Create RFQ"
              actionTo="/rfq/new"
              icon="+"
            />
          )}

          {!loading && rfqs.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-[6px] overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              {/* Table header */}
              <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-100 bg-slate-50">
                <div className="flex-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</div>
                <div className="w-20 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendors</div>
                <div className="w-24 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</div>
                <div className="w-20 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</div>
                <div className="w-14" />
              </div>
              {rfqs.map((rfq) => (
                <RFQRow
                  key={rfq._id}
                  rfq={rfq}
                  onDelete={() => setConfirmDeleteId(rfq._id)}
                />
              ))}
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-1">
              <button
                onClick={loadMore}
                className="text-xs text-slate-500 hover:text-teal-700 font-medium px-4 py-2 rounded-[6px] border border-slate-200 bg-white hover:border-teal-300 transition-colors"
                style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete RFQ"
          message="This will permanently delete the RFQ and all its quotes. This cannot be undone."
          confirmLabel={deleting ? "Deleting…" : "Delete"}
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}

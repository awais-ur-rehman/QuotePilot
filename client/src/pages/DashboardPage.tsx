import { Link } from "react-router-dom";
import { useRFQList } from "../hooks/useRFQ";
import Header from "../components/layout/Header";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import { timeAgo } from "../utils/formatters";
import type { RFQ } from "../types";

function RFQRow({ rfq }: { rfq: RFQ }) {
  const quotes = rfq.quotes ?? [];
  const completedQuotes = quotes.filter((q) => (q as { status: string }).status === "completed").length;
  const totalVendors = rfq.vendorIds.length;
  const progressPct = totalVendors > 0 ? (completedQuotes / totalVendors) * 100 : 0;

  return (
    <Link
      to={`/rfq/${rfq._id}`}
      className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 group"
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
  );
}

export default function DashboardPage() {
  const { rfqs, loading, error, refetch } = useRFQList();

  const stats = {
    total: rfqs.length,
    running: rfqs.filter((r) => r.status === "running").length,
    completed: rfqs.filter((r) => r.status === "completed").length,
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
              </div>
              {rfqs.map((rfq) => (
                <RFQRow key={rfq._id} rfq={rfq} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

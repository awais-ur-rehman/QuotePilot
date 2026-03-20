import { Link } from "react-router-dom";
import { useRFQList } from "../hooks/useRFQ";
import Header from "../components/layout/Header";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import { timeAgo } from "../utils/formatters";
import type { RFQ } from "../types";

function RFQCard({ rfq }: { rfq: RFQ }) {
  const quotes = rfq.quotes ?? [];
  const completedQuotes = quotes.filter((q) => (q as { status: string }).status === "completed").length;
  const totalVendors = rfq.vendorIds.length;

  return (
    <Link
      to={`/rfq/${rfq._id}`}
      className="card p-4 hover:border-slate-700 hover:bg-slate-900/80 transition-all duration-150 block group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white truncate">
            {rfq.title}
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {rfq.specs.productType} · qty {rfq.specs.quantity.toLocaleString()}
          </p>
        </div>
        <StatusBadge status={rfq.status} />
      </div>

      {rfq.status === "running" && totalVendors > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-mono">Agents running</span>
            <span className="font-mono text-teal-400">{completedQuotes}/{totalVendors}</span>
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-400 rounded-full transition-all duration-500"
              style={{ width: totalVendors > 0 ? `${(completedQuotes / totalVendors) * 100}%` : "0%" }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
        <span>{totalVendors} vendor{totalVendors !== 1 ? "s" : ""}</span>
        <span>{timeAgo(rfq.createdAt)}</span>
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
        title="Dashboard"
        subtitle={`${stats.total} RFQ${stats.total !== 1 ? "s" : ""}`}
        actions={
          <Link to="/rfq/new" className="btn-primary text-xs px-3 py-1.5">
            + New RFQ
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total RFQs", value: stats.total, color: "text-slate-200" },
            { label: "Running", value: stats.running, color: "text-teal-400" },
            { label: "Completed", value: stats.completed, color: "text-green-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="card px-4 py-3">
              <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* RFQ list */}
        {loading && (
          <div className="text-sm text-slate-500 font-mono animate-pulse">Loading...</div>
        )}

        {error && (
          <div className="card p-4 border-red-900/50 bg-red-900/10">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={refetch} className="text-xs text-slate-400 mt-2 hover:text-slate-200">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && rfqs.length === 0 && (
          <EmptyState
            title="No RFQs yet"
            description="Create your first RFQ to dispatch agents to vendor websites."
            actionLabel="+ Create RFQ"
            actionTo="/rfq/new"
          />
        )}

        {!loading && rfqs.length > 0 && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {rfqs.map((rfq) => (
              <RFQCard key={rfq._id} rfq={rfq} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

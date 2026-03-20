import { Link } from "react-router-dom";
import { useRFQList } from "../hooks/useRFQ";
import Header from "../components/layout/Header";
import { timeAgo, formatCurrency } from "../utils/formatters";
import type { RFQ, Quote } from "../types";

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ rfqs }: { rfqs: RFQ[] }) {
  const running = rfqs.filter((r) => r.status === "running").length;
  const completedQuotes = rfqs.reduce(
    (sum, r) => sum + (r.quotes?.filter((q) => (q as Quote).status === "completed").length ?? 0),
    0
  );
  const hoursSaved = Math.round((completedQuotes * 45) / 60);

  const stats = [
    { label: "This month", value: rfqs.length, color: "text-slate-700", sub: "RFQs" },
    { label: "Running now", value: running, color: "text-teal-700", sub: "active", live: running > 0 },
    { label: "Quotes collected", value: completedQuotes, color: "text-green-700", sub: "total" },
    { label: "Hours saved", value: `~${hoursSaved}h`, color: "text-blue-700", sub: "est." },
  ];

  return (
    <div className="flex items-stretch gap-3">
      {stats.map(({ label, value, color, sub, live }) => (
        <div
          key={label}
          className="flex-1 flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-[6px]"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div>
            <div className={`text-2xl font-bold font-mono leading-none ${color} flex items-center gap-1.5`}>
              {value}
              {live && <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse-dot inline-block" />}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{label} · {sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Active Run Card ──────────────────────────────────────────────────────────

function ActiveRunCard({ rfq }: { rfq: RFQ }) {
  const quotes: Quote[] = (rfq as unknown as { quotes?: Quote[] }).quotes ?? [];
  const done = quotes.filter((q) => q.status === "completed" || q.status === "failed" || q.status === "no_quote").length;
  const total = rfq.vendorIds.length;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const elapsed = timeAgo(rfq.updatedAt);

  return (
    <Link
      to={`/rfq/${rfq._id}`}
      className="flex flex-col gap-2.5 p-4 bg-white border border-teal-200 rounded-[6px] hover:border-teal-300 hover:shadow-sm transition-all"
      style={{ boxShadow: "0 1px 4px rgba(13,148,136,0.08)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-800 truncate">{rfq.title}</span>
        <span className="flex items-center gap-1 text-[11px] text-teal-600 font-medium shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse-dot" />
          Live
        </span>
      </div>
      <div className="text-xs text-slate-400 font-mono -mt-1 truncate">
        {rfq.specs.productType} · qty {rfq.specs.quantity.toLocaleString()}
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
          <span>{done}/{total} vendors done</span>
          <span>{elapsed}</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

interface ActivityItem {
  rfqId: string;
  rfqTitle: string;
  message: string;
  type: "success" | "launch" | "failed" | "partial";
  time: string;
}

function buildActivity(rfqs: RFQ[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const rfq of rfqs) {
    const quotes: Quote[] = (rfq as unknown as { quotes?: Quote[] }).quotes ?? [];
    const completed = quotes.filter((q) => q.status === "completed");
    const bestPrice = completed.length > 0
      ? Math.min(...completed.map((q) => q.unitPrice ?? Infinity))
      : null;

    if (rfq.status === "completed" || rfq.status === "awarded") {
      const awarded = rfq.status === "awarded";
      items.push({
        rfqId: rfq._id,
        rfqTitle: rfq.title,
        message: `${completed.length} quote${completed.length !== 1 ? "s" : ""} received${bestPrice && bestPrice !== Infinity ? ` · Best: ${formatCurrency(bestPrice)}/unit` : ""}${awarded ? " · Awarded ★" : ""}`,
        type: "success",
        time: rfq.updatedAt,
      });
    } else if (rfq.status === "running") {
      items.push({
        rfqId: rfq._id,
        rfqTitle: rfq.title,
        message: `Agents running · ${rfq.vendorIds.length} vendor${rfq.vendorIds.length !== 1 ? "s" : ""}`,
        type: "launch",
        time: rfq.updatedAt,
      });
    } else if (rfq.status === "failed") {
      items.push({
        rfqId: rfq._id,
        rfqTitle: rfq.title,
        message: "All agents failed to collect quotes",
        type: "failed",
        time: rfq.updatedAt,
      });
    } else if (rfq.status === "draft" && rfq.createdAt === rfq.updatedAt) {
      // freshly created draft — skip (no activity worth showing)
    }
  }

  return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);
}

const ACTIVITY_ICON: Record<string, { icon: string; color: string }> = {
  success: { icon: "✓", color: "text-green-600 bg-green-50" },
  launch:  { icon: "↗", color: "text-teal-600 bg-teal-50" },
  failed:  { icon: "✗", color: "text-red-500 bg-red-50" },
  partial: { icon: "!", color: "text-amber-600 bg-amber-50" },
};

function ActivityFeed({ rfqs }: { rfqs: RFQ[] }) {
  const items = buildActivity(rfqs);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-3xl text-slate-200 mb-3">⊞</div>
        <p className="text-sm font-semibold text-slate-700 mb-1">Your procurement hub is ready</p>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-4">
          Create your first RFQ and let agents collect quotes from multiple vendors simultaneously.
        </p>
        <Link to="/rfq/new" className="btn-primary text-xs px-4 py-2">
          + Create RFQ →
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item, i) => {
        const { icon, color } = ACTIVITY_ICON[item.type] ?? ACTIVITY_ICON.launch;
        return (
          <Link
            key={i}
            to={`/rfq/${item.rfqId}`}
            className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
          >
            <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${color}`}>
              {icon}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-slate-700">
                {item.rfqTitle}
              </span>
              <span className="text-xs text-slate-400 ml-2">{item.message}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono shrink-0 mt-0.5">
              {timeAgo(item.time)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const { rfqs, loading } = useRFQList();
  const running = rfqs.filter((r) => r.status === "running");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Overview"
        actions={
          <Link to="/rfq/new" className="btn-primary text-xs px-3 py-1.5">
            + New RFQ
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Stats */}
          {!loading && <StatsBar rfqs={rfqs} />}
          {loading && (
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-1 h-16 bg-slate-100 rounded-[6px] animate-pulse" />
              ))}
            </div>
          )}

          {/* Active runs */}
          {running.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse-dot" />
                  Active Now
                </h2>
                <Link to="/rfqs" className="text-xs text-teal-600 hover:text-teal-700">
                  View all →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {running.map((r) => <ActiveRunCard key={r._id} rfq={r} />)}
              </div>
            </div>
          )}

          {/* Activity feed */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Recent Activity
              </h2>
              {rfqs.length > 0 && (
                <Link to="/rfqs" className="text-xs text-teal-600 hover:text-teal-700">
                  All requests →
                </Link>
              )}
            </div>
            <div className="bg-white border border-slate-200 rounded-[6px] overflow-hidden"
                 style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              {loading ? (
                <div className="space-y-px p-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 px-3 py-3 animate-pulse">
                      <div className="w-5 h-5 bg-slate-100 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-slate-100 rounded w-3/4" />
                        <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ActivityFeed rfqs={rfqs} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

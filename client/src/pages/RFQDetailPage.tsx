import { useParams } from "react-router-dom";
import { useRFQ } from "../hooks/useRFQ";
import { useSSE } from "../hooks/useSSE";
import { rfqApi } from "../services/api";
import Header from "../components/layout/Header";
import StatusBadge from "../components/common/StatusBadge";
import { formatCurrency, truncate } from "../utils/formatters";
import type { AgentStreamEvent, Quote } from "../types";
import { useState, useRef, useEffect, memo } from "react";

// ─── Agent Activity Feed ──────────────────────────────────────────────────────

const EventRow = memo(function EventRow({ event }: { event: AgentStreamEvent }) {
  const config: Record<string, { icon: string; color: string }> = {
    STARTED:      { icon: "▶", color: "text-teal-400" },
    STREAMING_URL:{ icon: "🖥", color: "text-blue-400" },
    PROGRESS:     { icon: "⚡", color: "text-slate-400" },
    COMPLETE:     { icon: "✓", color: "text-green-400" },
    ERROR:        { icon: "✕", color: "text-red-400" },
    CONNECTED:    { icon: "◉", color: "text-slate-600" },
  };
  const c = config[event.type] ?? { icon: "·", color: "text-slate-600" };
  const ts = new Date(event.timestamp).toISOString().slice(11, 19);

  const getMessage = () => {
    const d = event.data as Record<string, unknown>;
    switch (event.type) {
      case "STARTED":     return `Agent started (run: ${(d.runId as string)?.slice(0, 8) ?? "…"})`;
      case "STREAMING_URL": return `Browser stream: ${(d.streamingUrl as string)?.slice(0, 60) ?? "…"}`;
      case "PROGRESS":    return d.purpose as string;
      case "COMPLETE":    return d.status === "COMPLETED" ? "Quote extracted successfully" : `Failed: ${d.error ?? "unknown"}`;
      case "ERROR":       return `Error: ${d.error as string}`;
      default:            return event.type;
    }
  };

  if ((event.type as string) === "CONNECTED" || !event.vendorName) return null;

  return (
    <div className="flex items-start gap-2.5 py-1.5 border-b border-slate-800/50 animate-slide-in">
      <span className={`font-mono text-xs ${c.color} w-4 shrink-0 mt-0.5 text-center`}>{c.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-slate-300">{event.vendorName}</span>
          <span className="text-[10px] text-slate-600 font-mono">{ts}</span>
        </div>
        <p className="text-xs text-slate-500 truncate">{getMessage()}</p>
      </div>
    </div>
  );
});

function AgentFeed({ events }: { events: AgentStreamEvent[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Activity Feed</span>
        <span className="text-[10px] text-slate-600 font-mono">{events.length} events</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {events.length === 0 && (
          <p className="text-xs text-slate-600 font-mono pt-4 text-center">
            Waiting for agent events…
          </p>
        )}
        {events.map((e, i) => (
          <EventRow key={i} event={e} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Quote Matrix ─────────────────────────────────────────────────────────────

function QuoteMatrix({ quotes }: { quotes: Quote[] }) {
  const [sortBy, setSortBy] = useState<"price" | "unitPrice" | "leadTime">("unitPrice");

  const sorted = [...quotes].sort((a, b) => {
    if (sortBy === "price") return (a.price ?? Infinity) - (b.price ?? Infinity);
    if (sortBy === "unitPrice") return (a.unitPrice ?? Infinity) - (b.unitPrice ?? Infinity);
    return 0;
  });

  const bestUnitPrice = Math.min(...quotes.filter((q) => q.unitPrice).map((q) => q.unitPrice!));

  if (quotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-slate-600 font-mono">
        No quotes yet — agents are working…
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-slate-500">Sort by:</span>
        {(["unitPrice", "price", "leadTime"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setSortBy(k === "leadTime" ? "price" : k)}
            className={`text-xs px-2 py-0.5 rounded font-mono ${
              sortBy === k ? "bg-teal-400/20 text-teal-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {k === "unitPrice" ? "Unit Price" : k === "price" ? "Total" : "Lead Time"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800">
              {["Vendor", "Status", "Unit Price", "Total Price", "Lead Time", "MOQ", "Notes"].map((h) => (
                <th key={h} className="text-left text-slate-500 font-medium pb-2 pr-4 font-mono whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((q) => {
              const isBest = q.unitPrice !== undefined && q.unitPrice === bestUnitPrice;
              const vendor = q.vendor as { name?: string } | undefined;
              return (
                <tr key={q._id} className={`border-b border-slate-800/50 ${isBest ? "bg-teal-400/5" : ""}`}>
                  <td className="py-2.5 pr-4 font-semibold text-slate-200 whitespace-nowrap">
                    {vendor?.name ?? "—"}
                    {isBest && <span className="ml-1.5 text-[10px] text-teal-400 font-mono">BEST</span>}
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge status={q.status} />
                  </td>
                  <td className={`py-2.5 pr-4 font-mono font-semibold ${isBest ? "text-teal-400" : "text-slate-200"}`}>
                    {formatCurrency(q.unitPrice, q.currency)}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-slate-300">
                    {formatCurrency(q.price, q.currency)}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-400">
                    {q.leadTime ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-slate-400">
                    {q.minimumOrder ? q.minimumOrder.toLocaleString() : "—"}
                  </td>
                  <td className="py-2.5 text-slate-500 max-w-xs">
                    {q.notes ? truncate(q.notes, 60) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Vendor Status Cards ──────────────────────────────────────────────────────

function VendorStatusGrid({
  rfq,
  vendorStatuses,
  streamingUrls,
}: {
  rfq: { vendorIds: string[] };
  vendorStatuses: Map<string, AgentStreamEvent["type"]>;
  streamingUrls: Map<string, string>;
}) {
  const quotes = (rfq as unknown as { quotes?: Quote[] }).quotes ?? [];

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
      {quotes.map((q) => {
        const vendor = q.vendor as { name?: string; _id?: string } | undefined;
        const liveStatus = vendorStatuses.get(q.vendorId) ?? null;
        const streamUrl = streamingUrls.get(q.vendorId);
        const effectiveStatus =
          liveStatus === "COMPLETE" ? q.status :
          liveStatus === "PROGRESS" || liveStatus === "STARTED" ? "running" :
          liveStatus === "ERROR" ? "failed" :
          q.status;

        return (
          <div key={q._id} className="card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200 truncate">{vendor?.name ?? "Vendor"}</span>
              <StatusBadge status={effectiveStatus} />
            </div>
            {streamUrl && (
              <a
                href={streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full h-20 bg-slate-800 rounded border border-slate-700 overflow-hidden hover:border-teal-400/30 transition-colors mb-2"
              >
                <iframe
                  src={streamUrl}
                  className="w-full h-full border-0 pointer-events-none scale-75 origin-top-left"
                  style={{ width: "133%", height: "133%" }}
                  title={`${vendor?.name} live view`}
                />
              </a>
            )}
            {q.unitPrice !== undefined && (
              <div className="text-xs font-mono text-teal-400 font-semibold">
                {formatCurrency(q.unitPrice, q.currency)} / unit
              </div>
            )}
            {q.errorMessage && (
              <div className="text-[10px] text-red-400 mt-1 truncate">{q.errorMessage}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RFQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { rfq, loading, error, refetch } = useRFQ(id ?? null);
  const { events, vendorStatuses, connected } = useSSE(
    rfq?.status === "running" || rfq?.status === "completed" ? (id ?? null) : null
  );

  // Extract streaming URLs from SSE events
  const streamingUrls = new Map<string, string>();
  for (const e of events) {
    if (e.type === "STREAMING_URL") {
      const d = e.data as { streamingUrl?: string };
      if (d.streamingUrl) streamingUrls.set(e.vendorId, d.streamingUrl);
    }
  }

  const quotes: Quote[] = ((rfq as unknown as { quotes?: Quote[] })?.quotes ?? []);

  const handleRun = async () => {
    if (!id) return;
    await rfqApi.run(id);
    refetch();
  };

  if (loading && !rfq) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-500 font-mono animate-pulse">
        Loading RFQ…
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="card p-6 text-center">
          <p className="text-sm text-red-400">{error ?? "RFQ not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title={rfq.title}
        subtitle={`${rfq.specs.productType} · qty ${rfq.specs.quantity.toLocaleString()}`}
        actions={
          <div className="flex items-center gap-2">
            {connected && rfq.status === "running" && (
              <span className="badge-running text-[10px]">● Live</span>
            )}
            <StatusBadge status={rfq.status} />
            {rfq.status === "draft" && (
              <button onClick={handleRun} className="btn-primary text-xs px-3 py-1.5">
                Launch Agents
              </button>
            )}
            {rfq.status === "completed" && (
              <button onClick={handleRun} className="btn-secondary text-xs px-3 py-1.5">
                Re-run
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Top row: Vendor status cards */}
        {quotes.length > 0 && (
          <div className="p-4 border-b border-slate-800">
            <p className="text-xs text-slate-500 font-mono mb-3 uppercase tracking-wider">
              Agent Status — {quotes.filter((q) => q.status === "completed").length}/{quotes.length} complete
            </p>
            <VendorStatusGrid rfq={rfq} vendorStatuses={vendorStatuses} streamingUrls={streamingUrls} />
          </div>
        )}

        {/* Bottom: Feed | Matrix */}
        <div className="flex-1 overflow-hidden flex">
          {/* Activity feed */}
          <div className="w-72 shrink-0 border-r border-slate-800 overflow-hidden flex flex-col">
            <AgentFeed events={events} />
          </div>

          {/* Quote matrix */}
          <div className="flex-1 overflow-y-auto p-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
              Quote Comparison Matrix
            </h2>
            <QuoteMatrix quotes={quotes} />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useParams } from "react-router-dom";
import { useRFQ } from "../hooks/useRFQ";
import { useAgentSocket } from "../hooks/useAgentSocket";
import { rfqApi } from "../services/api";
import Header from "../components/layout/Header";
import StatusBadge from "../components/common/StatusBadge";
import { formatCurrency, truncate } from "../utils/formatters";
import type { AgentStreamEvent, Quote } from "../types";
import { useState, useRef, useEffect, memo } from "react";

// ─── Terminal Log ─────────────────────────────────────────────────────────────

const TerminalRow = memo(function TerminalRow({ event }: { event: AgentStreamEvent }) {
  if (!event.vendorName || event.vendorName === "System") return null;

  const ts = new Date(event.timestamp).toISOString().slice(11, 19);

  const typeStyles: Record<string, string> = {
    STARTED:      "text-teal-400",
    STREAMING_URL:"text-blue-400",
    PROGRESS:     "text-slate-300",
    COMPLETE:     "text-green-400",
    ERROR:        "text-red-400",
  };
  const typeColor = typeStyles[event.type] ?? "text-slate-500";

  const getMessage = () => {
    const d = event.data as Record<string, unknown>;
    switch (event.type) {
      case "STARTED":      return `Agent started · run ${(d.runId as string)?.slice(0, 8) ?? "…"}`;
      case "STREAMING_URL":return `Browser stream ready`;
      case "PROGRESS":     return (d.purpose as string) ?? "Working…";
      case "COMPLETE":     return d.status === "COMPLETED" ? "Quote extracted ✓" : `Failed: ${String(d.error ?? "unknown")}`;
      case "ERROR":        return `Error: ${d.error as string}`;
      default:             return event.type;
    }
  };

  return (
    <div className="flex items-start gap-2 py-0.5 animate-slide-in font-mono text-[11px] leading-relaxed">
      <span className="text-slate-600 shrink-0 select-none">{ts}</span>
      <span className={`${typeColors(event.type)} shrink-0 w-[70px] truncate select-none`}>
        [{event.type.slice(0, 8)}]
      </span>
      <span className="text-slate-400 shrink-0 w-[90px] truncate">{event.vendorName}</span>
      <span className={`${typeColor} flex-1 min-w-0 break-all`}>{getMessage()}</span>
    </div>
  );
});

function typeColors(type: string): string {
  const m: Record<string, string> = {
    STARTED: "text-teal-400", COMPLETE: "text-green-400",
    ERROR: "text-red-400", STREAMING_URL: "text-blue-400",
    PROGRESS: "text-slate-500",
  };
  return m[type] ?? "text-slate-600";
}

function TerminalPanel({ events }: { events: AgentStreamEvent[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="terminal flex flex-col h-full overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-700/60">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        <span className="ml-3 text-slate-500 text-[11px] font-mono">agent.log — {events.length} events</span>
      </div>

      {/* Log body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {events.length === 0 ? (
          <div className="text-slate-600 text-[11px] font-mono pt-2">
            <span className="text-teal-500">$</span> Waiting for agent events…
            <span className="inline-block w-2 h-3 bg-slate-500 ml-0.5 animate-pulse" />
          </div>
        ) : (
          events.map((e, i) => <TerminalRow key={i} event={e} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Vendor Status Strip ──────────────────────────────────────────────────────

function VendorStrip({
  quotes,
  vendorStatuses,
}: {
  quotes: Quote[];
  vendorStatuses: Map<string, AgentStreamEvent["type"]>;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {quotes.map((q) => {
        const vendor = q.vendor as { name?: string } | undefined;
        const liveStatus = vendorStatuses.get(q.vendorId);
        const isRunning = liveStatus === "PROGRESS" || liveStatus === "STARTED";
        const isComplete = liveStatus === "COMPLETE" || q.status === "completed";
        const isError = liveStatus === "ERROR" || q.status === "failed";

        const dotClass = isRunning
          ? "bg-teal-600 animate-pulse-dot"
          : isComplete
          ? "bg-green-600"
          : isError
          ? "bg-red-500"
          : "bg-slate-300";

        return (
          <div
            key={q._id}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-[6px] text-xs"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
            <span className="font-medium text-slate-700">{vendor?.name ?? "Vendor"}</span>
            {q.unitPrice !== undefined && (
              <span className="text-slate-400 font-mono text-[10px] ml-1">
                {formatCurrency(q.unitPrice, q.currency)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Quote Table ──────────────────────────────────────────────────────────────

function QuoteTable({ quotes }: { quotes: Quote[] }) {
  const [sortKey, setSortKey] = useState<"unitPrice" | "price" | "leadTime">("unitPrice");

  const sorted = [...quotes].sort((a, b) => {
    if (sortKey === "unitPrice") return (a.unitPrice ?? Infinity) - (b.unitPrice ?? Infinity);
    if (sortKey === "price") return (a.price ?? Infinity) - (b.price ?? Infinity);
    return 0;
  });

  const bestUnitPrice = Math.min(...quotes.filter((q) => q.unitPrice !== undefined).map((q) => q.unitPrice!));

  const cols: Array<{ key: typeof sortKey; label: string }> = [
    { key: "unitPrice", label: "Unit Price" },
    { key: "price", label: "Total" },
  ];

  if (quotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-slate-400">
        No quotes yet — agents are working…
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Sort controls */}
      <div className="flex items-center gap-1 mb-3">
        <span className="text-xs text-slate-400 mr-1">Sort:</span>
        {cols.map((c) => (
          <button
            key={c.key}
            onClick={() => setSortKey(c.key)}
            className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
              sortKey === c.key
                ? "bg-teal-50 text-teal-700 border border-teal-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
          <tr>
            {["Vendor", "Status", "Unit Price", "Total", "Lead Time", "MOQ", "Shipping", "Notes"].map((h) => (
              <th key={h} className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 pr-4 whitespace-nowrap">
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
              <tr key={q._id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isBest ? "bg-teal-50/50" : ""}`}>
                <td className="py-3 pr-4 whitespace-nowrap">
                  <span className="font-semibold text-slate-800">{vendor?.name ?? "—"}</span>
                  {isBest && (
                    <span className="ml-2 text-[10px] bg-teal-100 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded font-semibold">
                      BEST
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={q.status} />
                </td>
                <td className={`py-3 pr-4 font-mono font-semibold whitespace-nowrap ${isBest ? "text-teal-700" : "text-slate-800"}`}>
                  {formatCurrency(q.unitPrice, q.currency)}
                </td>
                <td className="py-3 pr-4 font-mono text-slate-600 whitespace-nowrap">
                  {formatCurrency(q.price, q.currency)}
                </td>
                <td className="py-3 pr-4 text-slate-500">{q.leadTime ?? "—"}</td>
                <td className="py-3 pr-4 font-mono text-slate-500">
                  {q.minimumOrder ? q.minimumOrder.toLocaleString() : "—"}
                </td>
                <td className="py-3 pr-4 font-mono text-slate-500">
                  {q.shippingCost !== undefined ? formatCurrency(q.shippingCost, q.currency) : "—"}
                </td>
                <td className="py-3 text-slate-400 max-w-xs">
                  {q.notes ? truncate(q.notes, 60) : q.errorMessage ? (
                    <span className="text-red-500">{truncate(q.errorMessage, 50)}</span>
                  ) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RFQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { rfq, loading, error, refetch } = useRFQ(id ?? null);
  const { events, vendorStatuses, connected } = useAgentSocket(id ?? null);

  const quotes: Quote[] = ((rfq as unknown as { quotes?: Quote[] })?.quotes ?? []);

  const handleRun = async () => {
    if (!id) return;
    await rfqApi.run(id);
    refetch();
  };

  if (loading && !rfq) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-400 font-mono animate-pulse">
        Loading RFQ…
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-50 border border-red-200 rounded-[6px] p-6 text-center">
          <p className="text-sm text-red-700">{error ?? "RFQ not found"}</p>
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
              <span className="inline-flex items-center gap-1 text-xs text-teal-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse-dot" />
                Live
              </span>
            )}
            <StatusBadge status={rfq.status} />
            {rfq.status === "draft" && (
              <button onClick={handleRun} className="btn-primary text-xs px-3 py-1.5">
                Launch Agents →
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

      {/* Vendor strip */}
      {quotes.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <VendorStrip quotes={quotes} vendorStatuses={vendorStatuses} />
        </div>
      )}

      {/* Split panel */}
      <div className="flex-1 overflow-hidden flex">
        {/* LEFT: Terminal */}
        <div className="w-80 shrink-0 border-r border-slate-200 overflow-hidden flex flex-col">
          <TerminalPanel events={events} />
        </div>

        {/* RIGHT: Quote table */}
        <div className="flex-1 overflow-y-auto p-5 bg-white">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Quote Comparison</h2>
            <span className="text-xs text-slate-400 font-mono">
              {quotes.filter((q) => q.status === "completed").length}/{quotes.length} complete
            </span>
          </div>
          <QuoteTable quotes={quotes} />
        </div>
      </div>
    </div>
  );
}

import { useParams } from "react-router-dom";
import { useRFQ } from "../hooks/useRFQ";
import { useAgentSocket } from "../hooks/useAgentSocket";
import { rfqApi } from "../services/api";
import Header from "../components/layout/Header";
import StatusBadge from "../components/common/StatusBadge";
import { formatCurrency } from "../utils/formatters";
import type { AgentStreamEvent, Quote } from "../types";
import { useState, useRef, useEffect, memo } from "react";

// ─── Quote Detail Overlay ─────────────────────────────────────────────────────

function QuoteDetailOverlay({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const vendor = quote.vendor as { name?: string; website?: string } | undefined;

  const Field = ({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className={`text-sm text-slate-800 ${mono ? "font-mono" : ""}`}>{value ?? "—"}</span>
    </div>
  );

  const isSuccess = quote.status === "completed";
  const isFailed = quote.status === "failed" || quote.status === "no_quote";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[8px] border border-slate-200 w-full max-w-lg mx-4 overflow-hidden animate-fade-in"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className={`px-5 py-4 border-b border-slate-100 flex items-start justify-between ${
          isSuccess ? "bg-teal-50" : isFailed ? "bg-red-50" : "bg-slate-50"
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-base font-semibold text-slate-900">{vendor?.name ?? "Unknown Vendor"}</span>
              <StatusBadge status={quote.status} />
            </div>
            {vendor?.website && (
              <a
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-teal-600 hover:text-teal-700 font-mono"
              >
                {vendor.website}
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none ml-4 mt-0.5 shrink-0"
          >
            ×
          </button>
        </div>

        {/* Error state */}
        {isFailed && quote.errorMessage && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-100">
            <p className="text-sm text-red-700">{quote.errorMessage}</p>
          </div>
        )}

        {/* Fields grid */}
        {isSuccess && (
          <div className="px-5 py-5 grid grid-cols-2 gap-5">
            <Field label="Unit Price" value={formatCurrency(quote.unitPrice, quote.currency)} mono />
            <Field label="Total Price" value={formatCurrency(quote.price, quote.currency)} mono />
            <Field label="Lead Time" value={quote.leadTime} />
            <Field label="Min. Order (MOQ)" value={quote.minimumOrder?.toLocaleString()} mono />
            <Field label="Shipping" value={formatCurrency(quote.shippingCost, quote.currency)} mono />
            <Field label="Currency" value={quote.currency ?? "USD"} mono />
          </div>
        )}

        {/* Notes */}
        {quote.notes && (
          <div className="px-5 pb-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Notes</span>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-[6px] p-3 border border-slate-200">
              {quote.notes}
            </p>
          </div>
        )}

        {/* Footer meta */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
            {quote.stepsUsed !== undefined && <span>{quote.stepsUsed} steps</span>}
            {quote.costUsd !== undefined && <span>~${quote.costUsd.toFixed(3)} cost</span>}
          </div>
          <button onClick={onClose} className="btn-secondary text-xs px-3 py-1.5">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quote Table (4 columns) ──────────────────────────────────────────────────

function QuoteTable({
  quotes,
  onSelect,
}: {
  quotes: Quote[];
  onSelect: (q: Quote) => void;
}) {
  const sorted = [...quotes].sort((a, b) => (a.unitPrice ?? Infinity) - (b.unitPrice ?? Infinity));
  const bestUnitPrice =
    Math.min(...quotes.filter((q) => q.unitPrice !== undefined).map((q) => q.unitPrice!)) || Infinity;

  if (quotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-slate-400">
        No quotes yet — agents are working…
      </div>
    );
  }

  const isClickable = (q: Quote) =>
    q.status === "completed" || q.status === "failed" || q.status === "no_quote";

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50 sticky top-0">
          {["Vendor", "Unit Price", "Lead Time", "Status"].map((h) => (
            <th
              key={h}
              className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 first:pl-5 last:pr-5"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((q) => {
          const isBest = q.unitPrice !== undefined && q.unitPrice === bestUnitPrice;
          const vendor = q.vendor as { name?: string } | undefined;
          const clickable = isClickable(q);

          return (
            <tr
              key={q._id}
              onClick={() => clickable && onSelect(q)}
              className={[
                "border-b border-slate-100 transition-colors",
                isBest ? "bg-teal-50/60" : "",
                clickable ? "cursor-pointer hover:bg-slate-50" : "opacity-70",
              ].join(" ")}
            >
              {/* Vendor */}
              <td className="px-4 py-3.5 pl-5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{vendor?.name ?? "—"}</span>
                  {isBest && (
                    <span className="text-[10px] bg-teal-100 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded font-bold tracking-wide">
                      BEST
                    </span>
                  )}
                </div>
              </td>

              {/* Unit Price */}
              <td className={`px-4 py-3.5 font-mono font-semibold ${isBest ? "text-teal-700" : "text-slate-800"}`}>
                {formatCurrency(q.unitPrice, q.currency)}
              </td>

              {/* Lead Time */}
              <td className="px-4 py-3.5 text-slate-500">
                {q.leadTime ?? "—"}
              </td>

              {/* Status + click hint */}
              <td className="px-4 py-3.5 pr-5">
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={q.status} />
                  {clickable && (
                    <span className="text-[10px] text-slate-300 group-hover:text-slate-400 font-medium">
                      View →
                    </span>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
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
          ? "bg-green-500"
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

// ─── Terminal Panel (bottom bar) ──────────────────────────────────────────────

const TerminalRow = memo(function TerminalRow({ event }: { event: AgentStreamEvent }) {
  if (!event.vendorName || event.vendorName === "System") return null;

  const ts = new Date(event.timestamp).toISOString().slice(11, 19);

  const typeColor: Record<string, string> = {
    STARTED:       "text-teal-400",
    STREAMING_URL: "text-blue-400",
    PROGRESS:      "text-slate-400",
    COMPLETE:      "text-green-400",
    ERROR:         "text-red-400",
  };
  const msgColor = typeColor[event.type] ?? "text-slate-500";

  const getMessage = () => {
    const d = event.data as Record<string, unknown>;
    switch (event.type) {
      case "STARTED":       return `Agent started · run ${(d.runId as string)?.slice(0, 8) ?? "…"}`;
      case "STREAMING_URL": return "Browser stream ready";
      case "PROGRESS":      return (d.purpose as string) ?? "Working…";
      case "COMPLETE":      return d.status === "COMPLETED" ? "Quote extracted ✓" : `Failed: ${String(d.error ?? "unknown")}`;
      case "ERROR":         return `Error: ${d.error as string}`;
      default:              return event.type;
    }
  };

  return (
    <div className="flex items-baseline gap-3 py-[3px] min-w-0 animate-slide-in">
      <span className="text-slate-600 shrink-0 text-[10px] select-none tabular-nums">{ts}</span>
      <span className={`shrink-0 text-[10px] w-16 select-none ${typeColor[event.type] ?? "text-slate-600"}`}>
        [{event.type.slice(0, 7)}]
      </span>
      <span className="text-slate-400 shrink-0 text-[10px] w-24 truncate">{event.vendorName}</span>
      <span className={`${msgColor} text-[11px] flex-1 min-w-0 truncate`}>{getMessage()}</span>
    </div>
  );
});

function TerminalPanel({ events, connected }: { events: AgentStreamEvent[]; connected: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [events.length]);

  return (
    <div className="terminal flex flex-col h-full overflow-hidden border-l border-slate-700/40">
      {/* Terminal chrome */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-700/50 shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-3 text-[11px] font-mono text-slate-500 flex items-center gap-2">
          agent.log
          <span className="text-slate-600">—</span>
          {events.length} events
          {connected && (
            <span className="flex items-center gap-1 text-teal-400">
              <span className="w-1 h-1 rounded-full bg-teal-400 animate-pulse-dot" />
              live
            </span>
          )}
        </span>
      </div>

      {/* Scrollable log area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2">
        {events.length === 0 ? (
          <div className="text-[11px] font-mono text-slate-600 flex items-center gap-1 pt-1">
            <span className="text-teal-500">$</span>
            <span>Waiting for agent events…</span>
            <span className="inline-block w-1.5 h-3 bg-slate-600 animate-pulse ml-0.5" />
          </div>
        ) : (
          events.map((e, i) => <TerminalRow key={i} event={e} />)
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RFQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { rfq, loading, error, refetch } = useRFQ(id ?? null);
  const { events, vendorStatuses, connected } = useAgentSocket(id ?? null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

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

      {/* Vendor status strip */}
      {quotes.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-200 bg-white">
          <VendorStrip quotes={quotes} vendorStatuses={vendorStatuses} />
        </div>
      )}

      {/* Side-by-side: table LEFT, terminal RIGHT */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Quote table */}
        <div className="flex-1 overflow-y-auto bg-white">
          {quotes.length > 0 && (
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Quote Comparison</h2>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="font-mono">
                  {quotes.filter((q) => q.status === "completed").length}/{quotes.length} complete
                </span>
                <span>Click a row to see full details</span>
              </div>
            </div>
          )}
          <QuoteTable quotes={quotes} onSelect={setSelectedQuote} />
        </div>

        {/* Right: Terminal */}
        <div className="w-[420px] shrink-0 overflow-hidden">
          <TerminalPanel events={events} connected={connected} />
        </div>
      </div>

      {/* Quote detail overlay */}
      {selectedQuote && (
        <QuoteDetailOverlay
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
        />
      )}
    </div>
  );
}

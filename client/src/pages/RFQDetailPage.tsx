import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useRef, useEffect, memo } from "react";
import toast from "react-hot-toast";
import { useRFQ } from "../hooks/useRFQ";
import { useAgentSocket } from "../hooks/useAgentSocket";
import { useTemplates } from "../hooks/useTemplates";
import { rfqApi } from "../services/api";
import Header from "../components/layout/Header";
import StatusBadge from "../components/common/StatusBadge";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { formatCurrency } from "../utils/formatters";
import type { AgentStreamEvent, Quote, PopulatedVendorRef, RFQ } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getVendor(q: Quote): PopulatedVendorRef | null {
  if (typeof q.vendorId === "object" && q.vendorId !== null) return q.vendorId;
  return null;
}

function getVendorId(q: Quote): string {
  if (typeof q.vendorId === "object" && q.vendorId !== null) return q.vendorId._id;
  return q.vendorId as string;
}

// ─── Tab component ────────────────────────────────────────────────────────────

function Tab({ label, active, onClick, badge }: {
  label: string; active: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-4 py-2 font-medium rounded-[6px] transition-colors flex items-center gap-1.5 ${
        active
          ? "bg-teal-50 text-teal-700 border border-teal-200"
          : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
      {badge != null && badge > 0 && (
        <span className={`text-[10px] font-bold px-1 rounded ${active ? "text-teal-600" : "text-slate-400"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Quote Detail Overlay ─────────────────────────────────────────────────────

function QuoteDetailOverlay({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const vendor = getVendor(quote);
  const isSuccess = quote.status === "completed";
  const isFailed = quote.status === "failed" || quote.status === "no_quote";

  const Field = ({ label, value, mono = false, wide = false }: {
    label: string; value: React.ReactNode; mono?: boolean; wide?: boolean;
  }) => (
    <div className={wide ? "col-span-2" : ""}>
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">{label}</span>
      <span className={`text-sm text-slate-800 leading-relaxed ${mono ? "font-mono" : ""}`}>
        {value ?? <span className="text-slate-300">—</span>}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose}>
      <div className="bg-white rounded-[8px] border border-slate-200 w-full max-w-lg mx-4 overflow-hidden animate-fade-in"
           style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }} onClick={(e) => e.stopPropagation()}>
        <div className={`px-5 py-4 border-b border-slate-100 flex items-start justify-between ${isSuccess ? "bg-teal-50" : isFailed ? "bg-red-50" : "bg-slate-50"}`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-semibold text-slate-900">{vendor?.name ?? "Unknown Vendor"}</span>
              <StatusBadge status={quote.status} />
            </div>
            {vendor?.website && (
              <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:text-teal-700 font-mono">{vendor.website}</a>
            )}
            {(vendor?.tags?.length ?? 0) > 0 && <span className="ml-3 text-xs text-slate-400">{vendor!.tags.join(", ")}</span>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none ml-4 mt-0.5 shrink-0">×</button>
        </div>

        {isFailed && quote.errorMessage && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-100">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-0.5">Failure reason</p>
            <p className="text-sm text-red-700">{quote.errorMessage}</p>
          </div>
        )}

        {isSuccess && (
          <div className="px-5 py-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-slate-100">
            <Field label="Unit Price" value={formatCurrency(quote.unitPrice, quote.currency)} mono />
            <Field label="Total Price" value={formatCurrency(quote.price, quote.currency)} mono />
            <Field label="Lead Time" value={quote.leadTime} />
            <Field label="Min. Order (MOQ)" value={quote.minimumOrder ? `${quote.minimumOrder.toLocaleString()} units` : undefined} />
            <Field label="Shipping" value={quote.shippingCost != null ? formatCurrency(quote.shippingCost, quote.currency) : "Not provided"} mono />
            <Field label="Currency" value={quote.currency ?? "USD"} mono />
          </div>
        )}

        {quote.notes && (
          <div className="px-5 py-4 border-b border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Agent Notes</span>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-[6px] p-3 border border-slate-200 max-h-36 overflow-y-auto">{quote.notes}</p>
          </div>
        )}

        <div className="px-5 py-3 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
            {quote.stepsUsed !== undefined && <span>{quote.stepsUsed} agent steps</span>}
            {quote.costUsd !== undefined && <span>~${quote.costUsd.toFixed(3)} cost</span>}
          </div>
          <button onClick={onClose} className="btn-secondary text-xs px-3 py-1.5">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportQuotesCSV(rfqTitle: string, quotes: Quote[], rfq?: RFQ) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const withShipping = rfq?.shippingDetails?.destinationZip != null || quotes.some((q) => q.shipping?.cheapestRate != null);
  const withBenchmark = withShipping || quotes.some((q) => q.marketBenchmark?.avgMarketPrice != null);
  const headers = [
    "Vendor", "Status", "Unit Price", "Total", "Lead Time", "MOQ", "Currency", "Notes",
    ...(withShipping ? ["Shipping Est.", "Landed Cost"] : []),
    ...(withBenchmark ? ["vs Market"] : []),
  ];
  const rows = quotes.map((q) => {
    const vendor = typeof q.vendorId === "object" && q.vendorId !== null ? q.vendorId.name : q.vendorId;
    const benchDiff = q.marketBenchmark?.percentDiff;
    const benchText = benchDiff != null
      ? benchDiff < -5 ? `↓${Math.abs(benchDiff)}%` : benchDiff > 5 ? `↑${benchDiff}%` : "≈ mkt"
      : "";
    return [
      esc(vendor),
      esc(q.status),
      esc(q.unitPrice ?? ""),
      esc(q.price ?? ""),
      esc(q.leadTime ?? ""),
      esc(q.minimumOrder ?? ""),
      esc(q.currency ?? "USD"),
      esc(q.notes ?? q.errorMessage ?? ""),
      ...(withShipping ? [
        esc(q.shipping?.cheapestRate != null ? `$${q.shipping.cheapestRate.toFixed(2)} ${q.shipping.cheapestCarrier ?? ""}`.trim() : ""),
        esc(q.totalLandedCost != null ? `$${q.totalLandedCost.toFixed(2)}` : ""),
      ] : []),
      ...(withBenchmark ? [esc(benchText)] : []),
    ].join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quotes-${rfqTitle.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Quotes Tab ───────────────────────────────────────────────────────────────

function QuotesTab({ rfq, quotes, onSelectQuote, onRerunFailed, streamingUrls }: {
  rfq: RFQ; quotes: Quote[]; onSelectQuote: (q: Quote) => void; onRerunFailed: (ids: string[]) => void;
  streamingUrls?: Map<string, string>;
}) {
  const [sortKey, setSortKey] = useState<"unitPrice" | "totalLandedCost" | "price">("totalLandedCost");

  const hasShipping = rfq.shippingDetails?.destinationZip != null || quotes.some((q) => q.shipping?.cheapestRate != null);
  const hasBenchmark = hasShipping || quotes.some((q) => q.marketBenchmark?.avgMarketPrice != null);

  const effectiveSortKey = sortKey === "totalLandedCost" && !hasShipping ? "unitPrice" : sortKey;
  const sorted = [...quotes].sort((a, b) => {
    const av = (a as any)[effectiveSortKey] ?? Infinity;
    const bv = (b as any)[effectiveSortKey] ?? Infinity;
    return av - bv;
  });
  const completedPrices = quotes.filter((q) => q.status === "completed" && q.unitPrice !== undefined).map((q) => q.unitPrice!);
  const landedCosts = quotes.filter((q) => q.status === "completed" && q.totalLandedCost != null).map((q) => q.totalLandedCost!);
  const bestUnitPrice = completedPrices.length > 0 ? Math.min(...completedPrices) : Infinity;
  const bestLandedCost = landedCosts.length > 0 ? Math.min(...landedCosts) : Infinity;
  const isBestRow = (q: Quote) => q.status === "completed" && (
    hasShipping ? q.totalLandedCost === bestLandedCost : q.unitPrice === bestUnitPrice
  );
  const isClickable = (q: Quote) => q.status === "completed" || q.status === "failed" || q.status === "no_quote";
  const failedQuotes = quotes.filter((q) => q.status === "failed" || q.status === "no_quote");
  const showRerunFailed = failedQuotes.length > 0 && rfq.status !== "running";

  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center">
        <div className="text-2xl text-slate-200 mb-2">≡</div>
        <p className="text-sm text-slate-400">Agents are working — quotes will appear here as they arrive.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Sort pills + actions */}
      <div className="flex items-center gap-1.5 px-5 pb-3">
        <span className="text-xs text-slate-400 mr-1">Sort:</span>
        {([
          ["unitPrice", "Unit Price"],
          ["totalLandedCost", "Landed Cost"],
          ["price", "Total"],
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setSortKey(k)}
            className={`text-xs px-2.5 py-0.5 rounded font-medium transition-colors ${sortKey === k ? "bg-teal-50 text-teal-700 border border-teal-200" : "text-slate-400 hover:text-slate-600"}`}>
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {showRerunFailed && (
            <button
              onClick={() => onRerunFailed(failedQuotes.map((q) => getVendorId(q)))}
              className="text-xs px-2.5 py-1 rounded-[6px] border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors font-medium"
            >
              ↺ Re-run Failed ({failedQuotes.length})
            </button>
          )}
          {quotes.length > 0 && (
            <button
              onClick={() => exportQuotesCSV(rfq.title, quotes, rfq)}
              className="text-xs px-2.5 py-1 rounded-[6px] border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              ↓ CSV
            </button>
          )}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Vendor</th>
            <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Unit Price</th>
            <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Total</th>
            {hasShipping && <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Shipping</th>}
            {hasShipping && <th className="text-left text-[11px] font-semibold text-teal-600 uppercase tracking-wider px-4 py-3">Landed Cost</th>}
            {hasBenchmark && <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">vs Market</th>}
            <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 pr-5">Lead Time</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((q) => {
            const vendor = getVendor(q);
            const vid = getVendorId(q);
            const isBest = isBestRow(q);
            const isAwarded = rfq.awardedVendorId && vid === rfq.awardedVendorId;
            const clickable = isClickable(q);
            const isPending = q.status === "pending" || q.status === "running";
            const isFailed = q.status === "failed" || q.status === "no_quote";
            const benchDiff = q.marketBenchmark?.percentDiff;
            const isShippingRunning = q.shippingStatus === "estimating";
            const streamUrl = streamingUrls?.get(vid);
            const isLiveRunning = isPending && streamUrl;
            return (
              <tr key={q._id} onClick={() => clickable && onSelectQuote(q)}
                className={[
                  "border-b border-slate-100 transition-colors group",
                  isBest ? "bg-teal-50/50" : isAwarded ? "bg-blue-50/40" : "",
                  clickable ? "cursor-pointer hover:bg-slate-50" : isPending ? "opacity-60" : "",
                ].join(" ")}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{vendor?.name ?? "—"}</span>
                    {isBest && <span className="text-[9px] bg-teal-600 text-white px-1.5 py-0.5 rounded font-bold tracking-widest">BEST</span>}
                    {isAwarded && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">★ AWARDED</span>}
                  </div>
                  <div className="mt-0.5"><StatusBadge status={q.status} /></div>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`font-mono font-semibold text-sm ${isBest && !hasShipping ? "text-teal-700" : q.unitPrice ? "text-slate-800" : "text-slate-300"}`}>
                    {formatCurrency(q.unitPrice, q.currency)}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-mono text-slate-600">{formatCurrency(q.price, q.currency)}</span>
                </td>
                {hasShipping && (
                  <td className="px-4 py-3.5">
                    {isShippingRunning ? (
                      <span className="text-[11px] text-slate-400 animate-pulse">Checking…</span>
                    ) : q.shipping?.cheapestRate != null ? (
                      <div>
                        <span className="font-mono text-xs text-slate-700">${q.shipping.cheapestRate.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-400 ml-1">{q.shipping.cheapestCarrier}</span>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                )}
                {hasShipping && (
                  <td className="px-4 py-3.5">
                    {q.totalLandedCost != null ? (
                      <span className={`font-mono font-semibold text-sm ${isBest ? "text-teal-700" : "text-slate-800"}`}>
                        ${q.totalLandedCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : isShippingRunning ? (
                      <span className="text-[11px] text-slate-400 animate-pulse">Calculating…</span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                )}
                {hasBenchmark && (
                  <td className="px-4 py-3.5">
                    {benchDiff != null ? (
                      <span className={`text-xs font-semibold font-mono ${benchDiff < -5 ? "text-green-600" : benchDiff > 5 ? "text-red-600" : "text-slate-500"}`}>
                        {benchDiff < -5 ? `↓${Math.abs(benchDiff)}%` : benchDiff > 5 ? `↑${benchDiff}%` : "≈ mkt"}
                      </span>
                    ) : q.benchmarkStatus === "checking" ? (
                      <span className="text-[11px] text-slate-400 animate-pulse">…</span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3.5 pr-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 text-xs">{q.leadTime ?? (isPending ? "Pending…" : "—")}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {isLiveRunning && (
                        <a href={streamUrl} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-blue-500 hover:text-blue-700 font-medium" onClick={(e) => e.stopPropagation()}>
                          Watch →
                        </a>
                      )}
                      {isFailed && rfq.status !== "running" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onRerunFailed([vid]); }}
                          className="text-[10px] text-amber-600 hover:text-amber-700 font-medium border border-amber-200 px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 transition-colors"
                        >
                          ↺ Retry
                        </button>
                      )}
                      {clickable && !isFailed && <span className="text-[11px] text-slate-300 group-hover:text-teal-600 transition-colors font-medium">Details →</span>}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

    </div>
  );
}

// ─── Award Bar (sticky, outside scroll) ──────────────────────────────────────

function AwardBar({ rfq, quotes }: { rfq: RFQ; quotes: Quote[] }) {
  const completedQuotes = quotes.filter((q) => q.status === "completed");
  const [awardVendorId, setAwardVendorId] = useState<string | null>(rfq.awardedVendorId ?? null);
  const [awardNotes, setAwardNotes] = useState("");
  const [awarding, setAwarding] = useState(false);

  const prices = completedQuotes.filter((q) => q.unitPrice != null).map((q) => q.unitPrice!);
  const bestUnitPrice = prices.length > 0 ? Math.min(...prices) : Infinity;

  if ((rfq.status !== "completed" && rfq.status !== "awarded") || completedQuotes.length === 0) return null;

  if (rfq.status === "awarded") {
    return (
      <div className="px-5 py-2.5 border-b border-blue-200 bg-blue-50 flex items-center gap-3 shrink-0">
        <span className="text-blue-600">★</span>
        <span className="text-xs font-semibold text-blue-700">Quote awarded</span>
        {rfq.awardNotes && <span className="text-xs text-blue-600">— {rfq.awardNotes}</span>}
      </div>
    );
  }

  const handleAward = async () => {
    if (!awardVendorId) return;
    setAwarding(true);
    try {
      await rfqApi.award(rfq._id, awardVendorId, awardNotes || undefined);
      const q = completedQuotes.find((cq) => getVendorId(cq) === awardVendorId);
      toast.success(`Quote awarded to ${getVendor(q ?? completedQuotes[0])?.name ?? "vendor"} ★`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to award quote");
    } finally {
      setAwarding(false);
    }
  };

  return (
    <div className="px-5 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center gap-3 flex-wrap shrink-0">
      <span className="text-xs font-semibold text-slate-600 shrink-0">Award to:</span>
      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
        {completedQuotes.map((q) => {
          const vendor = getVendor(q);
          const vid = getVendorId(q);
          const isBest = q.unitPrice === bestUnitPrice;
          return (
            <label key={q._id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border cursor-pointer transition-colors text-xs ${awardVendorId === vid ? "bg-teal-50 border-teal-300 text-teal-800" : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"}`}>
              <input type="radio" name="award-bar" value={vid} checked={awardVendorId === vid} onChange={() => setAwardVendorId(vid)} className="accent-teal-600" />
              <span className="font-medium">{vendor?.name ?? vid}</span>
              {q.unitPrice != null && <span className="font-mono text-[10px] text-slate-400">{formatCurrency(q.unitPrice, q.currency)}</span>}
              {isBest && <span className="text-[9px] bg-teal-600 text-white px-1 py-0.5 rounded font-bold">BEST</span>}
            </label>
          );
        })}
      </div>
      <input
        className="input text-xs w-44 shrink-0"
        placeholder="Award note (optional)…"
        value={awardNotes}
        onChange={(e) => setAwardNotes(e.target.value)}
      />
      <button
        onClick={handleAward}
        disabled={!awardVendorId || awarding}
        className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 shrink-0"
      >
        {awarding ? "Awarding…" : "Award →"}
      </button>
    </div>
  );
}

// ─── Vendor Status Strip ──────────────────────────────────────────────────────

function VendorStrip({ quotes, vendorStatuses, streamingUrls }: {
  quotes: Quote[];
  vendorStatuses: Map<string, AgentStreamEvent["type"]>;
  streamingUrls: Map<string, string>;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {quotes.map((q) => {
        const vendor = getVendor(q);
        const vid = getVendorId(q);
        const liveStatus = vendorStatuses.get(vid);
        const streamUrl = streamingUrls.get(vid);
        const isRunning = liveStatus === "PROGRESS" || liveStatus === "STARTED";
        const isComplete = liveStatus === "COMPLETE" || q.status === "completed";
        const isError = liveStatus === "ERROR" || q.status === "failed";

        const dotClass = isRunning ? "bg-teal-600 animate-pulse-dot" : isComplete ? "bg-green-500" : isError ? "bg-red-500" : "bg-slate-300";

        return (
          <div key={q._id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-[6px] text-xs" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
            <span className="font-medium text-slate-700">{vendor?.name ?? "Vendor"}</span>
            {q.unitPrice !== undefined && (
              <span className="text-slate-400 font-mono text-[10px] ml-0.5">{formatCurrency(q.unitPrice, q.currency)}/unit</span>
            )}
            {streamUrl && isRunning && (
              <a href={streamUrl} target="_blank" rel="noopener noreferrer"
                className="ml-1 text-[10px] text-blue-500 hover:text-blue-700 font-medium" onClick={(e) => e.stopPropagation()}>
                Watch →
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Activity Tab (Terminal) ──────────────────────────────────────────────────

const AGENT_TYPE_ICONS: Record<string, string> = {
  quote:     "",
  shipping:  "ship",
  trust:     "trust",
  benchmark: "bench",
  discovery: "disc",
  pipeline:  "pipe",
};

const AGENT_TYPE_COLORS: Record<string, string> = {
  shipping:  "text-blue-400",
  trust:     "text-amber-400",
  benchmark: "text-emerald-400",
  discovery: "text-purple-400",
  pipeline:  "text-teal-300",
};

const TerminalRow = memo(function TerminalRow({ event }: { event: AgentStreamEvent }) {
  if (!event.vendorName || event.vendorName === "System") return null;
  const ts = new Date(event.timestamp).toISOString().slice(11, 19);
  const d = event.data as Record<string, unknown>;
  const agentType = (d?.agentType as string) ?? "quote";

  const baseTypeColor: Record<string, string> = {
    STARTED: "text-teal-400", STREAMING_URL: "text-blue-400",
    PROGRESS: "text-slate-400", COMPLETE: "text-green-400", ERROR: "text-red-400",
  };
  const agentColor = AGENT_TYPE_COLORS[agentType];
  const rowColor = agentColor ?? (baseTypeColor[event.type] ?? "text-slate-400");
  const icon = AGENT_TYPE_ICONS[agentType] ?? "";

  const getMessage = () => {
    switch (event.type) {
      case "STARTED":       return d.message ? String(d.message) : `Agent started · run ${(d.runId as string)?.slice(0, 8) ?? "…"}`;
      case "STREAMING_URL": return "Browser stream ready";
      case "PROGRESS":      return (d.purpose as string) ?? "Working…";
      case "COMPLETE":      return d.message ? String(d.message) : (d.status === "COMPLETED" ? "Complete ✓" : `Failed: ${String(d.error ?? "unknown")}`);
      case "ERROR":         return `Error: ${d.error as string}`;
      default:              return event.type;
    }
  };

  return (
    <div className="flex items-baseline gap-3 py-[3px] min-w-0 animate-slide-in">
      <span className="text-slate-600 shrink-0 text-[10px] select-none tabular-nums">{ts}</span>
      <span className={`shrink-0 text-[10px] w-16 select-none ${rowColor}`}>[{event.type.slice(0, 7)}]</span>
      <span className="text-slate-400 shrink-0 text-[10px] w-24 truncate">{icon} {event.vendorName}</span>
      <span className={`${rowColor} text-[11px] flex-1 min-w-0 truncate`}>{getMessage()}</span>
    </div>
  );
});

function ActivityTab({ events, connected }: { events: AgentStreamEvent[]; connected: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  return (
    <div className="terminal flex flex-col overflow-hidden" style={{ minHeight: "400px" }}>
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-700/50 shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-3 text-[11px] font-mono text-slate-500 flex items-center gap-2">
          agent.log — {events.length} events
          {connected && (
            <span className="flex items-center gap-1 text-teal-400 ml-1">
              <span className="w-1 h-1 rounded-full bg-teal-400 animate-pulse-dot" /> live
            </span>
          )}
        </span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2.5 min-h-0" style={{ maxHeight: "calc(100vh - 280px)" }}>
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

// ─── Details Tab ──────────────────────────────────────────────────────────────

function DetailsTab({ rfq, onSaveTemplate }: { rfq: RFQ; onSaveTemplate: (name: string) => void }) {
  const [templateName, setTemplateName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const specFields = [
    { label: "Product Type", value: rfq.specs.productType },
    { label: "Quantity", value: `${rfq.specs.quantity.toLocaleString()} units` },
    rfq.specs.dimensions ? { label: "Dimensions", value: rfq.specs.dimensions } : null,
    rfq.specs.material ? { label: "Material", value: rfq.specs.material } : null,
    rfq.specs.color ? { label: "Color / Print", value: rfq.specs.color } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const customFields = rfq.specs.customFields
    ? Object.entries(rfq.specs.customFields)
    : [];

  return (
    <div className="px-5 py-5 space-y-6 max-w-2xl">
      {/* Product specs */}
      <div>
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Product Specifications</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {specFields.map(({ label, value }) => (
            <div key={label}>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">{label}</span>
              <span className="text-sm text-slate-800">{value}</span>
            </div>
          ))}
          {customFields.map(([k, v]) => (
            <div key={k}>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">{k}</span>
              <span className="text-sm text-slate-800 font-mono">{String(v)}</span>
            </div>
          ))}
        </div>
        {rfq.description && (
          <div className="mt-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Notes</span>
            <p className="text-sm text-slate-700 leading-relaxed">{rfq.description}</p>
          </div>
        )}
      </div>

      {/* Contact */}
      <div>
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Contact Information</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Company</span>
            <span className="text-sm text-slate-800">{rfq.contactInfo.companyName}</span>
          </div>
          {rfq.contactInfo.contactName && (
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Contact</span>
              <span className="text-sm text-slate-800">{rfq.contactInfo.contactName}</span>
            </div>
          )}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Email</span>
            <span className="text-sm text-slate-800 font-mono">{rfq.contactInfo.email}</span>
          </div>
          {rfq.contactInfo.phone && (
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Phone</span>
              <span className="text-sm text-slate-800 font-mono">{rfq.contactInfo.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Meta */}
      <div>
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Metadata</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Created</span>
            <span className="text-xs text-slate-600 font-mono">{new Date(rfq.createdAt).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Vendors</span>
            <span className="text-xs text-slate-600">{rfq.vendorIds.length} selected</span>
          </div>
          <div className="col-span-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">RFQ ID</span>
            <span className="text-xs text-slate-400 font-mono">{rfq._id}</span>
          </div>
        </div>
      </div>

      {/* Save as Template */}
      <div className="border-t border-slate-100 pt-4">
        {!showSave ? (
          <button onClick={() => setShowSave(true)} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
            + Save as Template
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              className="input text-xs flex-1"
              placeholder="Template name…"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && templateName.trim()) { onSaveTemplate(templateName); setShowSave(false); setTemplateName(""); }}}
              autoFocus
            />
            <button
              onClick={() => { if (templateName.trim()) { onSaveTemplate(templateName); setShowSave(false); setTemplateName(""); }}}
              disabled={!templateName.trim()}
              className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
            >
              Save
            </button>
            <button onClick={() => setShowSave(false)} className="btn-ghost text-xs px-2 py-1.5">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pipeline Indicator ───────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: "quotes",      label: "Quotes" },
  { key: "shipping",    label: "Shipping" },
  { key: "benchmarking",label: "Market" },
  { key: "complete",    label: "Complete" },
] as const;

function PipelineIndicator({ stage, rfqStatus }: { stage?: string; rfqStatus: string }) {
  const stageOrder = ["quotes", "shipping", "benchmarking", "complete"];
  const currentIdx = stage ? stageOrder.indexOf(stage) : rfqStatus === "running" ? 0 : -1;

  return (
    <div className="flex items-center gap-0 select-none">
      {PIPELINE_STAGES.map((s, i) => {
        const done   = currentIdx > i;
        const active = currentIdx === i;
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full border-2 transition-all duration-500 ${
                done    ? "bg-green-500 border-green-500" :
                active  ? "bg-teal-600 border-teal-600 animate-pulse" :
                          "bg-white border-slate-300"
              }`} />
              <span className={`text-[9px] mt-1 font-medium leading-none whitespace-nowrap ${
                done ? "text-green-600" : active ? "text-teal-700" : "text-slate-400"
              }`}>{s.label}</span>
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <div className={`h-px w-8 mx-0.5 mb-3 transition-colors duration-500 ${done ? "bg-green-400" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Intelligence Card ────────────────────────────────────────────────────────

function IntelligenceCard({ quotes, rfq }: { quotes: Quote[]; rfq: RFQ }) {
  const completed = quotes.filter((q) => q.status === "completed" && q.unitPrice != null);
  if (completed.length === 0 || rfq.pipelineStage !== "complete") return null;

  const hasShipping = completed.some((q) => q.totalLandedCost != null);
  const best = hasShipping
    ? completed.reduce((a, b) => ((a.totalLandedCost ?? Infinity) < (b.totalLandedCost ?? Infinity) ? a : b))
    : completed.reduce((a, b) => ((a.unitPrice ?? Infinity) < (b.unitPrice ?? Infinity) ? a : b));
  const runnerUp = completed.filter((q) => q._id !== best._id)
    .sort((a, b) => {
      const av = hasShipping ? (a.totalLandedCost ?? Infinity) : (a.unitPrice ?? Infinity);
      const bv = hasShipping ? (b.totalLandedCost ?? Infinity) : (b.unitPrice ?? Infinity);
      return av - bv;
    })[0];

  const bestVendor = getVendor(best);
  const runnerUpVendor = runnerUp ? getVendor(runnerUp) : null;

  const bench = best.marketBenchmark;
  const benchText = bench?.percentDiff != null
    ? bench.percentDiff < -5 ? `${Math.abs(bench.percentDiff)}% below market average ($${bench.avgMarketPrice?.toFixed(2)}/unit)`
    : bench.percentDiff > 5  ? `${bench.percentDiff}% above market average`
    : "at market average"
    : null;

  return (
    <div className="mx-5 mt-4 mb-2 border border-teal-200 rounded-[8px] bg-teal-50/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-bold text-teal-800 mb-1">Recommendation</p>
          <p className="text-sm font-semibold text-slate-900">
            {bestVendor?.name ?? "Best vendor"} — best total value
            {hasShipping && best.totalLandedCost != null && (
              <span className="text-teal-700 ml-1">
                (${best.totalLandedCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} landed)
              </span>
            )}
          </p>
          <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
            {benchText && <p>• {benchText}</p>}
            {best.shipping?.cheapestCarrier && best.shipping.estimatedDays && (
              <p>• Fastest shipping: {best.shipping.estimatedDays} days via {best.shipping.cheapestCarrier}</p>
            )}
            {runnerUp && runnerUpVendor && (
              <p className="text-slate-400 mt-1">
                Runner-up: {runnerUpVendor.name} at{" "}
                {hasShipping && runnerUp.totalLandedCost != null
                  ? `$${runnerUp.totalLandedCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} landed`
                  : formatCurrency(runnerUp.unitPrice, runnerUp.currency) + "/unit"
                }
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TabKey = "quotes" | "activity" | "details";

export default function RFQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { rfq, loading, error, refetch } = useRFQ(id ?? null);
  const { events, vendorStatuses, streamingUrls, connected } = useAgentSocket(id ?? null);
  const [activeTab, setActiveTab] = useState<TabKey>("quotes");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { saveTemplate } = useTemplates();
  const quotes: Quote[] = ((rfq as unknown as { quotes?: Quote[] })?.quotes ?? []);

  const handleRun = async () => {
    if (!id) return;
    setRunLoading(true);
    try {
      await rfqApi.run(id);
      refetch();
      toast.success("Agents launched!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to launch agents");
    } finally {
      setRunLoading(false);
    }
  };

  const handleRerunFailed = async (vendorIds: string[]) => {
    if (!id) return;
    setRunLoading(true);
    try {
      await rfqApi.run(id, vendorIds);
      refetch();
      toast.success(`Re-running ${vendorIds.length} failed vendor${vendorIds.length !== 1 ? "s" : ""}…`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to re-run vendors");
    } finally {
      setRunLoading(false);
    }
  };

  const handleSaveTemplate = (name: string) => {
    if (!rfq) return;
    saveTemplate(name, {
      specs: rfq.specs,
      description: rfq.description,
    });
    toast.success(`Template "${name}" saved`);
  };

  const handleCancel = async () => {
    if (!id) return;
    setCancelLoading(true);
    try {
      await rfqApi.cancel(id);
      refetch();
      toast.success("Run cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleteLoading(true);
    try {
      await rfqApi.delete(id);
      toast.success("RFQ deleted");
      navigate("/rfqs");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
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
          <Link to="/rfqs" className="text-xs text-teal-600 hover:underline mt-3 block">← Back to Requests</Link>
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
            <Link to="/rfqs" className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors mr-1">
              ← Requests
            </Link>
            {connected && rfq.status === "running" && (
              <span className="inline-flex items-center gap-1 text-xs text-teal-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse-dot" /> Live
              </span>
            )}
            <StatusBadge status={rfq.status} />
            {rfq.status === "running" && (
              <button onClick={handleCancel} disabled={cancelLoading}
                className="text-xs px-3 py-1.5 rounded-[6px] font-semibold border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50">
                {cancelLoading ? "Cancelling…" : "Cancel Run"}
              </button>
            )}
            {rfq.status === "draft" && (
              <button onClick={handleRun} disabled={runLoading} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                {runLoading ? "Launching…" : "Launch Agents →"}
              </button>
            )}
            {(rfq.status === "completed" || rfq.status === "failed" || rfq.status === "cancelled" || rfq.status === "awarded") && (
              <button onClick={handleRun} disabled={runLoading} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50">
                {runLoading ? "Re-running…" : "Re-run"}
              </button>
            )}
            <button onClick={() => setShowDeleteConfirm(true)}
              className="btn-ghost text-xs px-2.5 py-1.5 text-red-500 hover:bg-red-50 hover:text-red-600">
              Delete
            </button>
          </div>
        }
      />

      {/* Vendor strip */}
      {quotes.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-200 bg-white">
          <VendorStrip quotes={quotes} vendorStatuses={vendorStatuses} streamingUrls={streamingUrls} />
        </div>
      )}

      {/* Tab bar */}
      <div className="px-5 py-2.5 border-b border-slate-200 bg-white flex items-center gap-1.5">
        <Tab label="Quotes" active={activeTab === "quotes"} onClick={() => setActiveTab("quotes")}
          badge={quotes.filter((q) => q.status === "completed").length} />
        <Tab label="Activity" active={activeTab === "activity"} onClick={() => setActiveTab("activity")}
          badge={events.length} />
        <Tab label="Details" active={activeTab === "details"} onClick={() => setActiveTab("details")} />
        <div className="ml-auto flex items-center gap-4">
          {(rfq.status === "running" || rfq.pipelineStage) && (
            <PipelineIndicator stage={rfq.pipelineStage} rfqStatus={rfq.status} />
          )}
          {activeTab === "quotes" && quotes.length > 0 && (
            <span className="text-xs text-slate-400">
              {quotes.filter((q) => q.status === "completed").length}/{quotes.length} complete
              {quotes.some((q) => q.status === "completed") && (
                <span className="ml-2 text-slate-300">· click row for details</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Award bar — outside scroll, visible on quotes tab only */}
      {activeTab === "quotes" && <AwardBar rfq={rfq} quotes={quotes} />}

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto bg-white">
        {activeTab === "quotes" && (
          <>
            <IntelligenceCard quotes={quotes} rfq={rfq} />
            <QuotesTab rfq={rfq} quotes={quotes} onSelectQuote={setSelectedQuote} onRerunFailed={handleRerunFailed} streamingUrls={streamingUrls} />
          </>
        )}
        {activeTab === "activity" && (
          <ActivityTab events={events} connected={connected} />
        )}
        {activeTab === "details" && (
          <DetailsTab rfq={rfq} onSaveTemplate={handleSaveTemplate} />
        )}
      </div>

      {selectedQuote && (
        <QuoteDetailOverlay quote={selectedQuote} onClose={() => setSelectedQuote(null)} />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete RFQ"
          message="This will permanently delete this RFQ and all its quotes."
          confirmLabel={deleteLoading ? "Deleting…" : "Delete RFQ"}
          danger
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

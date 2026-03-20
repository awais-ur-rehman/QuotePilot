import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useRef, useEffect, memo } from "react";
import toast from "react-hot-toast";
import { useRFQ } from "../hooks/useRFQ";
import { useAgentSocket } from "../hooks/useAgentSocket";
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

// ─── RFQ Info Overlay ─────────────────────────────────────────────────────────

function RFQInfoOverlay({ rfq, onClose }: { rfq: RFQ; onClose: () => void }) {
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
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{rfq.title}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">RFQ Specifications</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none ml-4">×</button>
        </div>

        <div className="px-5 py-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-slate-100">
          {[
            { label: "Product Type", value: rfq.specs.productType },
            { label: "Quantity", value: rfq.specs.quantity.toLocaleString() + " units" },
            rfq.specs.dimensions && { label: "Dimensions", value: rfq.specs.dimensions },
            rfq.specs.material && { label: "Material", value: rfq.specs.material },
            rfq.specs.color && { label: "Color / Print", value: rfq.specs.color },
          ]
            .filter(Boolean)
            .map((f) => {
              const field = f as { label: string; value: string };
              return (
                <div key={field.label}>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    {field.label}
                  </span>
                  <span className="text-sm text-slate-800">{field.value}</span>
                </div>
              );
            })}

          {rfq.description && (
            <div className="col-span-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Notes</span>
              <p className="text-sm text-slate-700 leading-relaxed">{rfq.description}</p>
            </div>
          )}

          {rfq.specs.customFields && Object.keys(rfq.specs.customFields).length > 0 && (
            Object.entries(rfq.specs.customFields).map(([k, v]) => (
              <div key={k}>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">{k}</span>
                <span className="text-sm text-slate-800 font-mono">{String(v)}</span>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Contact</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-xs text-slate-400">Company</span>
              <div className="text-slate-800">{rfq.contactInfo.companyName}</div>
            </div>
            {rfq.contactInfo.contactName && (
              <div>
                <span className="text-xs text-slate-400">Contact</span>
                <div className="text-slate-800">{rfq.contactInfo.contactName}</div>
              </div>
            )}
            <div>
              <span className="text-xs text-slate-400">Email</span>
              <div className="text-slate-800 font-mono text-xs">{rfq.contactInfo.email}</div>
            </div>
            {rfq.contactInfo.phone && (
              <div>
                <span className="text-xs text-slate-400">Phone</span>
                <div className="text-slate-800 font-mono text-xs">{rfq.contactInfo.phone}</div>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-xs px-3 py-1.5">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Quote Detail Overlay ─────────────────────────────────────────────────────

function QuoteDetailOverlay({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const vendor = getVendor(quote);

  const Field = ({
    label,
    value,
    mono = false,
    wide = false,
  }: {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
    wide?: boolean;
  }) => (
    <div className={wide ? "col-span-2" : ""}>
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
        {label}
      </span>
      <span className={`text-sm text-slate-800 leading-relaxed ${mono ? "font-mono" : ""}`}>
        {value ?? <span className="text-slate-300">—</span>}
      </span>
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
        {/* Header */}
        <div
          className={`px-5 py-4 border-b border-slate-100 flex items-start justify-between ${
            isSuccess ? "bg-teal-50" : isFailed ? "bg-red-50" : "bg-slate-50"
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-semibold text-slate-900">
                {vendor?.name ?? "Unknown Vendor"}
              </span>
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
            {vendor?.category && (
              <span className="ml-3 text-xs text-slate-400">{vendor.category}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none ml-4 mt-0.5 shrink-0"
          >
            ×
          </button>
        </div>

        {/* Error */}
        {isFailed && quote.errorMessage && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-100">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-0.5">
              Failure reason
            </p>
            <p className="text-sm text-red-700">{quote.errorMessage}</p>
          </div>
        )}

        {/* Pricing + details grid */}
        {isSuccess && (
          <div className="px-5 py-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-slate-100">
            <Field label="Unit Price" value={formatCurrency(quote.unitPrice, quote.currency)} mono />
            <Field label="Total Price" value={formatCurrency(quote.price, quote.currency)} mono />
            <Field label="Lead Time" value={quote.leadTime} />
            <Field label="Min. Order (MOQ)" value={
              quote.minimumOrder ? `${quote.minimumOrder.toLocaleString()} units` : undefined
            } />
            <Field
              label="Shipping"
              value={
                quote.shippingCost != null
                  ? formatCurrency(quote.shippingCost, quote.currency)
                  : "Not provided"
              }
              mono
            />
            <Field label="Currency" value={quote.currency ?? "USD"} mono />
          </div>
        )}

        {/* Notes */}
        {quote.notes && (
          <div className="px-5 py-4 border-b border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Agent Notes
            </span>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-[6px] p-3 border border-slate-200 max-h-36 overflow-y-auto">
              {quote.notes}
            </p>
          </div>
        )}

        {/* Footer meta */}
        <div className="px-5 py-3 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
            {quote.stepsUsed !== undefined && (
              <span>{quote.stepsUsed} agent steps</span>
            )}
            {quote.costUsd !== undefined && (
              <span>~${quote.costUsd.toFixed(3)} cost</span>
            )}
          </div>
          <button onClick={onClose} className="btn-secondary text-xs px-3 py-1.5">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quote Table ──────────────────────────────────────────────────────────────

function QuoteTable({
  quotes,
  onSelect,
}: {
  quotes: Quote[];
  onSelect: (q: Quote) => void;
}) {
  const [sortKey, setSortKey] = useState<"unitPrice" | "price">("unitPrice");

  const sorted = [...quotes].sort(
    (a, b) => (a[sortKey] ?? Infinity) - (b[sortKey] ?? Infinity)
  );

  const completedPrices = quotes
    .filter((q) => q.status === "completed" && q.unitPrice !== undefined)
    .map((q) => q.unitPrice!);
  const bestUnitPrice = completedPrices.length > 0 ? Math.min(...completedPrices) : Infinity;

  const isClickable = (q: Quote) =>
    q.status === "completed" || q.status === "failed" || q.status === "no_quote";

  if (quotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-slate-400">
        No quotes yet — agents are working…
      </div>
    );
  }

  return (
    <div>
      {/* Sort pills */}
      <div className="flex items-center gap-1.5 px-5 pb-3">
        <span className="text-xs text-slate-400 mr-1">Sort by:</span>
        {(["unitPrice", "price"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setSortKey(k)}
            className={`text-xs px-2.5 py-0.5 rounded font-medium transition-colors ${
              sortKey === k
                ? "bg-teal-50 text-teal-700 border border-teal-200"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {k === "unitPrice" ? "Unit Price" : "Total"}
          </button>
        ))}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
              Vendor
            </th>
            <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
              Unit Price
            </th>
            <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
              Total
            </th>
            <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 pr-5">
              Lead Time
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((q) => {
            const vendor = getVendor(q);
            const isBest = q.status === "completed" && q.unitPrice === bestUnitPrice;
            const clickable = isClickable(q);
            const isPending = q.status === "pending" || q.status === "running";

            return (
              <tr
                key={q._id}
                onClick={() => clickable && onSelect(q)}
                className={[
                  "border-b border-slate-100 transition-colors group",
                  isBest ? "bg-teal-50/50" : "",
                  clickable
                    ? "cursor-pointer hover:bg-slate-50"
                    : isPending
                    ? "opacity-60"
                    : "",
                ].join(" ")}
              >
                {/* Vendor + status */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">
                          {vendor?.name ?? "—"}
                        </span>
                        {isBest && (
                          <span className="text-[9px] bg-teal-600 text-white px-1.5 py-0.5 rounded font-bold tracking-widest">
                            BEST
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5">
                        <StatusBadge status={q.status} />
                      </div>
                    </div>
                  </div>
                </td>

                {/* Unit Price */}
                <td className="px-4 py-3.5">
                  <span
                    className={`font-mono font-semibold text-sm ${
                      isBest ? "text-teal-700" : q.unitPrice ? "text-slate-800" : "text-slate-300"
                    }`}
                  >
                    {formatCurrency(q.unitPrice, q.currency)}
                  </span>
                </td>

                {/* Total */}
                <td className="px-4 py-3.5">
                  <span className="font-mono text-slate-600">
                    {formatCurrency(q.price, q.currency)}
                  </span>
                </td>

                {/* Lead Time + click hint */}
                <td className="px-4 py-3.5 pr-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 text-xs">
                      {q.leadTime ?? (isPending ? "Pending…" : "—")}
                    </span>
                    {clickable && (
                      <span className="text-[11px] text-slate-300 group-hover:text-teal-600 transition-colors font-medium shrink-0">
                        Details →
                      </span>
                    )}
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

// ─── Vendor Status Strip ──────────────────────────────────────────────────────

function VendorStrip({
  quotes,
  vendorStatuses,
  streamingUrls,
}: {
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
              <span className="text-slate-400 font-mono text-[10px] ml-0.5">
                {formatCurrency(q.unitPrice, q.currency)}/unit
              </span>
            )}
            {streamUrl && isRunning && (
              <a
                href={streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 text-[10px] text-blue-500 hover:text-blue-700 font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                Watch →
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Terminal Panel ───────────────────────────────────────────────────────────

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

function TerminalPanel({
  events,
  connected,
}: {
  events: AgentStreamEvent[];
  connected: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [events.length]);

  return (
    <div className="terminal flex flex-col h-full overflow-hidden border-l border-slate-700/40">
      {/* Chrome bar */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-700/50 shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-3 text-[11px] font-mono text-slate-500 flex items-center gap-2">
          agent.log
          <span className="text-slate-600">—</span>
          {events.length} events
          {connected && (
            <span className="flex items-center gap-1 text-teal-400 ml-1">
              <span className="w-1 h-1 rounded-full bg-teal-400 animate-pulse-dot" />
              live
            </span>
          )}
        </span>
      </div>

      {/* Log area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2.5">
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
  const navigate = useNavigate();
  const { rfq, loading, error, refetch } = useRFQ(id ?? null);
  const { events, vendorStatuses, streamingUrls, connected } = useAgentSocket(id ?? null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
      navigate("/");
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
          <Link to="/" className="text-xs text-teal-600 hover:underline mt-3 block">← Back to Dashboard</Link>
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
            <Link to="/" className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors mr-1">
              ← Requests
            </Link>

            <button
              onClick={() => setShowInfo(true)}
              className="btn-ghost text-xs px-2.5 py-1.5"
              title="View RFQ specs"
            >
              Info
            </button>

            {connected && rfq.status === "running" && (
              <span className="inline-flex items-center gap-1 text-xs text-teal-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse-dot" />
                Live
              </span>
            )}
            <StatusBadge status={rfq.status} />

            {rfq.status === "running" && (
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="text-xs px-3 py-1.5 rounded-[6px] font-semibold border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {cancelLoading ? "Cancelling…" : "Cancel Run"}
              </button>
            )}
            {rfq.status === "draft" && (
              <button
                onClick={handleRun}
                disabled={runLoading}
                className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
              >
                {runLoading ? "Launching…" : "Launch Agents →"}
              </button>
            )}
            {(rfq.status === "completed" || rfq.status === "failed") && (
              <button
                onClick={handleRun}
                disabled={runLoading}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50"
              >
                {runLoading ? "Re-running…" : "Re-run"}
              </button>
            )}

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-ghost text-xs px-2.5 py-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              Delete
            </button>
          </div>
        }
      />

      {/* Vendor status strip */}
      {quotes.length > 0 && (
        <div className="px-5 py-3 border-b border-slate-200 bg-white">
          <VendorStrip quotes={quotes} vendorStatuses={vendorStatuses} streamingUrls={streamingUrls} />
        </div>
      )}

      {/* Side-by-side: table LEFT, terminal RIGHT */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Quote table */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Quote Comparison</h2>
            <span className="text-xs text-slate-400">
              {quotes.filter((q) => q.status === "completed").length}/{quotes.length} complete
              {quotes.some((q) => q.status === "completed") && (
                <span className="ml-2 text-slate-300">· click row for details</span>
              )}
            </span>
          </div>
          <QuoteTable quotes={quotes} onSelect={setSelectedQuote} />
        </div>

        {/* Right: Terminal */}
        <div className="w-[420px] shrink-0 overflow-hidden">
          <TerminalPanel events={events} connected={connected} />
        </div>
      </div>

      {/* Overlays */}
      {selectedQuote && (
        <QuoteDetailOverlay
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
        />
      )}

      {showInfo && (
        <RFQInfoOverlay rfq={rfq} onClose={() => setShowInfo(false)} />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete RFQ"
          message="This will permanently delete this RFQ and all its quotes. This cannot be undone."
          confirmLabel={deleteLoading ? "Deleting…" : "Delete"}
          danger
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

import type { RFQStatus, QuoteStatus, AgentRunStatus } from "../../types";

type AnyStatus = RFQStatus | QuoteStatus | AgentRunStatus | string;

const STATUS_CONFIG: Record<string, { label: string; className: string; dotClass: string }> = {
  draft:     { label: "Draft",     className: "badge-draft",      dotClass: "bg-slate-400" },
  running:   { label: "Running",   className: "badge-running",    dotClass: "bg-teal-600 animate-pulse-dot" },
  completed: { label: "Completed", className: "badge-completed",  dotClass: "bg-green-600" },
  failed:    { label: "Failed",    className: "badge-failed",     dotClass: "bg-red-600" },
  pending:   { label: "Pending",   className: "badge-pending",    dotClass: "bg-amber-500" },
  no_quote:  { label: "No Quote",  className: "badge-draft",      dotClass: "bg-slate-400" },
  queued:    { label: "Queued",    className: "badge-pending",    dotClass: "bg-amber-500" },
  started:   { label: "Started",   className: "badge-running",    dotClass: "bg-teal-600 animate-pulse-dot" },
  cancelled: { label: "Cancelled", className: "badge-draft",      dotClass: "bg-slate-400" },
};

export default function StatusBadge({ status }: { status: AnyStatus }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "badge-draft",
    dotClass: "bg-slate-400",
  };

  return (
    <span className={config.className}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`} />
      {config.label}
    </span>
  );
}

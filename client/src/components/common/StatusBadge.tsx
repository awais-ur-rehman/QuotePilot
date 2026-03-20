import type { RFQStatus, QuoteStatus, AgentRunStatus } from "../../types";

type AnyStatus = RFQStatus | QuoteStatus | AgentRunStatus | string;

const STATUS_CONFIG: Record<string, { label: string; className: string; dot?: string }> = {
  draft:     { label: "Draft",     className: "badge-draft",      dot: "bg-slate-500" },
  running:   { label: "Running",   className: "badge-running",    dot: "bg-teal-400 animate-pulse-teal" },
  completed: { label: "Completed", className: "badge-completed",  dot: "bg-green-400" },
  failed:    { label: "Failed",    className: "badge-failed",     dot: "bg-red-400" },
  pending:   { label: "Pending",   className: "badge-pending",    dot: "bg-amber-400" },
  no_quote:  { label: "No Quote",  className: "badge-draft",      dot: "bg-slate-500" },
  queued:    { label: "Queued",    className: "badge-pending",    dot: "bg-amber-400" },
  started:   { label: "Started",   className: "badge-running",    dot: "bg-teal-400 animate-pulse-teal" },
  cancelled: { label: "Cancelled", className: "badge-draft",      dot: "bg-slate-500" },
};

export default function StatusBadge({ status }: { status: AnyStatus }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "badge-draft",
    dot: "bg-slate-500",
  };

  return (
    <span className={config.className}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

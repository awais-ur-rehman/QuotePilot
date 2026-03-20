export function formatCurrency(value: number | undefined, currency = "USD"): string {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function truncate(str: string, max = 80): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}

export function estimateCost(steps: number): string {
  return formatCurrency(steps * 0.013);
}

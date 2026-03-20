import { Link } from "react-router-dom";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
}

export default function EmptyState({ title, description, actionLabel, actionTo }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
        <span className="text-2xl text-slate-600">◈</span>
      </div>
      <h3 className="text-sm font-semibold text-slate-300 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs">{description}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-primary mt-5 text-sm">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

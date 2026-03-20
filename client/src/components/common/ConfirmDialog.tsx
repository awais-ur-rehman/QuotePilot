interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-[8px] border border-slate-200 w-full max-w-sm mx-4 overflow-hidden animate-fade-in"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
          <button onClick={onCancel} className="btn-secondary text-xs px-3 py-1.5">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`text-xs px-3 py-1.5 rounded-[6px] font-semibold transition-colors ${
              danger
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-teal-600 text-white hover:bg-teal-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
      <div className="flex items-baseline gap-2.5">
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        {subtitle && (
          <span className="text-sm text-slate-400 font-mono">{subtitle}</span>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

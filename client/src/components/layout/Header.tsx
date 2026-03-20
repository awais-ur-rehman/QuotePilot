interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="h-14 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-sm font-semibold text-white">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-500 font-mono">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

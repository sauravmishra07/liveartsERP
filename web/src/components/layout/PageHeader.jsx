export function PageHeader({ title, description, actions, children }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-xl font-semibold -tracking-[0.3px]">{title}</h1>
        {description && <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>}
      </div>
      {(actions || children) && <div className="flex items-center gap-2">{actions}{children}</div>}
    </div>
  );
}

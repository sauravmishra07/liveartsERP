export function EmptyState({ icon: Icon, title = 'Nothing here yet', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {Icon && (
        <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
          <Icon className="size-6" />
        </div>
      )}
      <div>
        <div className="font-medium">{title}</div>
        {description && <div className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">{description}</div>}
      </div>
      {action}
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TONE = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  info: 'bg-info/10 text-info',
  destructive: 'bg-destructive/10 text-destructive',
};

export function StatCard({ label, value, icon: Icon, tone = 'primary', to, hint }) {
  const inner = (
    <Card className="gap-0 py-0">
      <CardContent className="flex items-center gap-4 p-5">
        {Icon && (
          <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-lg', TONE[tone])}>
            <Icon className="size-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</div>
          <div className="truncate text-2xl font-bold">{value}</div>
          {hint && <div className="text-muted-foreground text-xs">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
  return to ? (
    <Link to={to} className="block rounded-xl transition hover:shadow-md">
      {inner}
    </Link>
  ) : (
    inner
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  Clock,
  Database,
  KeyRound,
  Laptop,
  Moon,
  Play,
  Server,
  Shield,
  Sun,
  User,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/AuthContext';
import { useTheme } from '@/app/ThemeProvider';
import { changePassword } from '@/api/auth';
import { listBranches } from '@/api/branches';
import { getHealth } from '@/api/health';
import { getJobsStatus, runDailyRecompute, runMonthlyJobs } from '@/api/jobs';
import { PageHeader } from '@/components/layout/PageHeader';
import { Field } from '@/components/forms/fields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { roleLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

const ADMIN_ROLES = ['SUPER_ADMIN', 'BRANCH_ADMIN'];
const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  return (
    <div>
      <PageHeader title="Settings" description="Your account, appearance and system status" />
      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileCard user={user} />
        <AppearanceCard />
        <PasswordCard />
        {isAdmin ? <SystemCard /> : <AboutCard />}
        {isAdmin && <BranchesCard />}
        {isAdmin && <AboutCard />}
      </div>
    </div>
  );
}

function ProfileCard({ user }) {
  const initials = (user?.name || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><User className="size-4" /> Profile</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full text-lg font-bold">{initials}</div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{user?.name}</div>
            <div className="text-muted-foreground truncate text-sm">{user?.email}</div>
          </div>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Row label="Role"><Badge variant="secondary">{roleLabel(user?.role)}</Badge></Row>
          <Row label="Scope">{user?.branchId ? 'Single branch' : 'All branches'}</Row>
        </dl>
        <p className="text-muted-foreground border-t pt-3 text-xs">
          Name, email and role are managed by an administrator on the Users screen.
        </p>
      </CardContent>
    </Card>
  );
}

function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Sun className="size-4" /> Appearance</CardTitle></CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-3 text-sm">Choose how Live Arts looks on this device.</p>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition',
                theme === t.value ? 'border-primary bg-primary/5 text-primary font-medium' : 'hover:bg-muted',
              )}
            >
              <t.icon className="size-5" />
              {t.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const { signOut } = useAuth();
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const mismatch = f.confirm.length > 0 && f.next !== f.confirm;
  const tooShort = f.next.length > 0 && f.next.length < 8;
  const valid = f.current && f.next.length >= 8 && f.next === f.confirm;

  const mut = useMutation({
    mutationFn: () => changePassword(f.current, f.next),
    onSuccess: async () => {
      toast.success('Password changed — please sign in again');
      setF({ current: '', next: '', confirm: '' });
      setTimeout(() => signOut(), 1200); // all sessions were revoked server-side
    },
    onError: (e) => toast.error(e.message || 'Could not change password'),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="size-4" /> Change password</CardTitle></CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) mut.mutate();
          }}
        >
          <Field label="Current password" htmlFor="cur">
            <Input id="cur" type="password" autoComplete="current-password" value={f.current} onChange={set('current')} />
          </Field>
          <Field label="New password" htmlFor="new" error={tooShort ? 'Use at least 8 characters' : undefined}>
            <Input id="new" type="password" autoComplete="new-password" value={f.next} onChange={set('next')} />
          </Field>
          <Field label="Confirm new password" htmlFor="conf" error={mismatch ? 'Passwords do not match' : undefined}>
            <Input id="conf" type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} />
          </Field>
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" disabled={!valid || mut.isPending}>
              {mut.isPending ? 'Saving…' : 'Update password'}
            </Button>
            <span className="text-muted-foreground text-xs">Signs you out of all devices.</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SystemCard() {
  const qc = useQueryClient();
  const healthQ = useQuery({ queryKey: ['health'], queryFn: getHealth, refetchInterval: 30000 });
  const jobsQ = useQuery({ queryKey: ['jobs', 'status'], queryFn: getJobsStatus, refetchInterval: 30000 });

  // A run changes both the "last run" stamp and the numbers every screen shows.
  const afterRun = () => {
    qc.invalidateQueries({ queryKey: ['jobs'] });
    qc.invalidateQueries({ queryKey: ['dash'] });
  };

  const daily = useMutation({
    mutationFn: () => runDailyRecompute(),
    onSuccess: (r) => {
      toast.success(`Daily done — ${r.status?.changed ?? 0} status changes, ${r.fee?.updated ?? 0} fees`);
      afterRun();
    },
    onError: (e) => toast.error(e.message),
  });
  const monthly = useMutation({
    mutationFn: () => runMonthlyJobs(),
    onSuccess: (r) => {
      toast.success(`Monthly done — ${r.recurring?.created ?? 0} expenses, ${r.salaries?.posted ?? 0} salaries`);
      afterRun();
    },
    onError: (e) => toast.error(e.message),
  });

  const h = healthQ.data;
  const j = jobsQ.data;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Server className="size-4" /> System</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {healthQ.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <ServiceRow icon={Server} label="API" ok={h?.status === 'ok'} value={h?.status === 'ok' ? `up ${Math.floor((h?.uptime ?? 0) / 60)}m` : 'down'} />
            <ServiceRow icon={Database} label="MongoDB" ok={h?.mongo === 'connected'} value={h?.mongo} />
            <ServiceRow icon={Database} label="Redis" ok={h?.redis === 'up'} value={h?.redis} warn />
            <ServiceRow icon={Clock} label="Scheduler" ok={j?.queuesEnabled} value={j?.queuesEnabled ? 'enabled' : 'manual only'} warn />
          </div>
        )}

        <div className="border-t pt-4">
          <div className="mb-1 text-sm font-medium">Recompute jobs</div>
          <p className="text-muted-foreground mb-3 text-xs">
            {j?.queuesEnabled
              ? 'Scheduled automatically. You can still trigger a run now.'
              : 'Redis is offline, so schedules are dormant — trigger runs manually here.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => daily.mutate()} disabled={daily.isPending}>
              <Play className={cn('size-3.5', daily.isPending && 'animate-pulse')} /> Run daily
            </Button>
            <Button variant="outline" size="sm" onClick={() => monthly.mutate()} disabled={monthly.isPending}>
              <Play className={cn('size-3.5', monthly.isPending && 'animate-pulse')} /> Run monthly
            </Button>
          </div>
          <dl className="text-muted-foreground mt-3 space-y-1 text-xs">
            <div>Last daily run: <span className="text-foreground">{j?.lastDaily ? new Date(j.lastDaily).toLocaleString('en-IN') : 'never'}</span></div>
            <div>Last monthly run: <span className="text-foreground">{j?.lastMonthly ? new Date(j.lastMonthly).toLocaleString('en-IN') : 'never'}</span></div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

function BranchesCard() {
  const q = useQuery({ queryKey: ['branches'], queryFn: () => listBranches() });
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="size-4" /> Branches</CardTitle></CardHeader>
      <CardContent>
        {q.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="space-y-2">
            {(q.data || []).map((b) => (
              <div key={b._id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                <div>
                  <div className="font-medium">{b.name}</div>
                  {b.address && <div className="text-muted-foreground text-xs">{b.address}</div>}
                </div>
                <Badge variant={b.status === 'Inactive' ? 'secondary' : 'default'}>{b.status || 'Active'}</Badge>
              </div>
            ))}
          </div>
        )}
        <p className="text-muted-foreground mt-3 border-t pt-3 text-xs">Manage branches on the Branches screen.</p>
      </CardContent>
    </Card>
  );
}

function AboutCard() {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="size-4" /> About</CardTitle></CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Row label="Application">Live Arts ERP</Row>
          <Row label="Version">1.0.0</Row>
          <Row label="API endpoint"><code className="text-xs">{import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}</code></Row>
          <Row label="Timezone">Asia/Kolkata (IST)</Row>
        </dl>
      </CardContent>
    </Card>
  );
}

function Row({ label, children }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

function ServiceRow({ icon: Icon, label, ok, value, warn }) {
  const Status = ok ? CheckCircle2 : XCircle;
  return (
    <div className="flex items-center gap-2 rounded-lg border p-2.5">
      <Icon className="text-muted-foreground size-4 shrink-0" />
      <span className="flex-1 text-sm">{label}</span>
      <Status className={cn('size-4', ok ? 'text-success' : warn ? 'text-warning' : 'text-destructive')} />
      <span className="text-muted-foreground w-20 truncate text-right text-xs">{value || '—'}</span>
    </div>
  );
}

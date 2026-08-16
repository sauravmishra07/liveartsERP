import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarCheck,
  GraduationCap,
  Play,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/app/AuthContext';
import { getAnalytics, getBatchSummary, getOverview, getRecent } from '@/api/dashboard';
import { runDailyRecompute } from '@/api/jobs';
import { listBranches } from '@/api/branches';
import { AreaChart, BarChart, DonutChart, RankedBars, Sparkline, niceStep } from '@/components/charts/Charts';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToolbarSelect } from '@/components/forms/fields';
import { currency, currencyShort, formatDate, fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';

const ADMIN_ROLES = ['SUPER_ADMIN', 'BRANCH_ADMIN'];
const RANGES = [
  { value: '3', label: 'Last 3 months' },
  { value: '6', label: 'Last 6 months' },
  { value: '12', label: 'Last 12 months' },
];
// Paid → teal (ok), Balance → gold (warn), Unpaid → purple (neutral), Overdue → rose (bad).
const NO_TREND = [];
const MIX_COLORS = ['var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--destructive)'];

export default function DashboardPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = ADMIN_ROLES.includes(user?.role);
  const crossBranch = user?.role === 'SUPER_ADMIN';
  const [branchId, setBranchId] = useState('');
  const [months, setMonths] = useState(6);
  const params = branchId ? { branchId } : undefined;
  const monthsLabel = RANGES.find((r) => r.value === String(months))?.label;

  const branchesQ = useQuery({ queryKey: ['branches'], queryFn: () => listBranches(), enabled: crossBranch });
  const overviewQ = useQuery({ queryKey: ['dash', 'overview', branchId], queryFn: () => getOverview(params) });
  const analyticsQ = useQuery({
    queryKey: ['dash', 'analytics', branchId, months],
    queryFn: () => getAnalytics({ ...(params || {}), months }),
  });
  const recentQ = useQuery({ queryKey: ['dash', 'recent', branchId], queryFn: () => getRecent(params) });
  const batchQ = useQuery({ queryKey: ['dash', 'batch-summary', branchId], queryFn: () => getBatchSummary(params) });

  const o = overviewQ.data;
  const a = analyticsQ.data;
  const trend = a?.trend ?? NO_TREND;
  const prev = trend.length > 1 ? trend[trend.length - 2] : null;

  const jobsMut = useMutation({
    mutationFn: () => runDailyRecompute(branchId || undefined),
    onSuccess: (r) => {
      toast.success(`Recompute complete — ${r.status?.changed ?? 0} status changes, ${r.fee?.updated ?? 0} fees updated`);
      qc.invalidateQueries({ queryKey: ['dash'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const collected = a?.collectionMode;
  const modeTotal = (collected?.cash ?? 0) + (collected?.online ?? 0);

  // Only days that were actually marked — otherwise the axis shows a run of empty
  // dates before the data starts and the chart reads as broken.
  const attendanceDays = useMemo(
    () =>
      (a?.attendance ?? [])
        .filter((d) => d.present + d.absent > 0)
        .map((d) => ({ ...d, label: shortDay(d.day) })),
    [a?.attendance],
  );

  const attendanceRate = useMemo(() => {
    const present = attendanceDays.reduce((s, d) => s + d.present, 0);
    const marked = attendanceDays.reduce((s, d) => s + d.present + d.absent, 0);
    return marked ? Math.round((present / marked) * 100) : null;
  }, [attendanceDays]);

  const feeMix = useMemo(() => withExactPercentages(a?.paymentMix ?? []), [a?.paymentMix]);

  // Round gridlines (₹25k, ₹50k, ₹1L…) rather than whatever the data max happens to be.
  const revenueStep = useMemo(
    () => niceStep(Math.max(0, ...trend.flatMap((t) => [t.revenue, t.expenses])), 5),
    [trend],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Good to see you, ${user?.name?.split(' ')[0] || ''}`}
        description={
          crossBranch
            ? branchId
              ? branchesQ.data?.find((b) => b._id === branchId)?.name
              : 'Consolidated view · all branches'
            : 'Your branch overview'
        }
        actions={
          <>
            {crossBranch && (
              <ToolbarSelect
                value={branchId}
                onChange={setBranchId}
                placeholder="All branches"
                className="w-44"
                options={(branchesQ.data || []).map((b) => ({ value: b._id, label: b.name }))}
              />
            )}
            {isAdmin && (
              <Button variant="outline" onClick={() => jobsMut.mutate()} disabled={jobsMut.isPending}>
                <Play className={cn(jobsMut.isPending && 'animate-pulse')} /> Recompute
              </Button>
            )}
          </>
        }
      />

      {/* KPI summary — the five numbers that answer "how are we doing?" at a glance. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <Kpi
          label="Active students"
          value={o?.activeStudents ?? 0}
          loading={overviewQ.isLoading}
          hint={`of ${o?.totalStudents ?? 0} on roll`}
          icon={GraduationCap}
          tone="info"
          to="/students"
        />
        <Kpi
          label="Revenue"
          value={currencyShort(o?.revenueThisMonth)}
          loading={overviewQ.isLoading}
          delta={delta(o?.revenueThisMonth, prev?.revenue)}
          spark={trend.map((t) => t.revenue)}
          sparkColor="var(--chart-1)"
          icon={Wallet}
          tone="primary"
          to="/fees"
        />
        <Kpi
          label="Expenses"
          value={currencyShort(o?.expensesThisMonth)}
          loading={overviewQ.isLoading}
          delta={delta(o?.expensesThisMonth, prev?.expenses, true)}
          spark={trend.map((t) => t.expenses)}
          sparkColor="var(--chart-6)"
          icon={Banknote}
          tone="purple"
          to="/expenses"
        />
        <Kpi
          label="Overdue fees"
          value={o?.overdueCount ?? 0}
          loading={overviewQ.isLoading}
          hint={`${currencyShort(o?.pendingExpected)} from ${o?.duesCount ?? 0} students`}
          icon={AlertTriangle}
          tone="destructive"
          to="/fees"
        />
        <Kpi
          label="Attendance"
          value={attendanceRate === null ? '—' : `${attendanceRate}%`}
          loading={analyticsQ.isLoading}
          hint={attendanceDays.length ? `across ${attendanceDays.length} days` : 'not marked yet'}
          spark={attendanceDays.map((d) => d.rate)}
          sparkColor="var(--chart-3)"
          icon={CalendarCheck}
          tone="success"
          to="/attendance"
        />
      </div>

      {/* Revenue vs expenses — the headline chart. */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Financial performance</CardTitle>
            <p className="text-muted-foreground mt-0.5 text-[13px]">
              Revenue vs expenses{monthsLabel ? ` · ${monthsLabel}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ToolbarSelect
              value={String(months)}
              onChange={(v) => setMonths(Number(v) || 6)}
              options={RANGES}
              placeholder="Last 6 months"
              className="h-8 w-[150px]"
            />
            <Link to="/reports" className="text-primary flex items-center gap-1 text-[13px] font-medium hover:underline">
              Reports <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {analyticsQ.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <AreaChart
              data={trend}
              xKey="month"
              format={currencyShort}
              yStep={revenueStep}
              series={[
                // Revenue is emphasised: it's usually the smaller line, and it must stay
                // readable when expenses (salaries) dwarf it.
                { key: 'revenue', label: 'Revenue', color: 'var(--chart-1)', emphasis: true },
                { key: 'expenses', label: 'Expenses', color: 'var(--chart-6)' },
              ]}
            />
          )}
        </CardContent>
      </Card>

      {/* items-start: let each card size to its own content instead of stretching to
          match the tallest sibling, which was leaving a big void under the bar chart. */}
      <div className="grid items-start gap-4 [&>*]:min-w-0 lg:grid-cols-5">
        {/* Fee status donut */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Fee status</CardTitle>
            {o?.overdueCount > 0 && (
              <Badge variant="destructive">{o.overdueCount} overdue</Badge>
            )}
          </CardHeader>
          <CardContent>
            {analyticsQ.isLoading ? (
              <Skeleton className="h-[210px] w-full" />
            ) : (
              <>
                <DonutChart data={feeMix} colors={MIX_COLORS} centerLabel="Active students" size={190} />
                <div className="mt-4 flex items-center justify-between border-t pt-3 text-[13px]">
                  <span className="text-muted-foreground">
                    <span className="text-foreground font-semibold">{currency(o?.pendingExpected)}</span> outstanding
                  </span>
                  <Link to="/fees" className="text-primary flex items-center gap-1 font-medium hover:underline">
                    Collect <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Attendance */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Attendance</CardTitle>
              <p className="text-muted-foreground mt-0.5 text-[13px]">
                {attendanceDays.length ? `Last ${attendanceDays.length} active days` : 'Present vs absent per day'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {attendanceRate !== null && (
                <Badge variant={attendanceRate >= 85 ? 'success' : attendanceRate >= 70 ? 'warning' : 'destructive'}>
                  {attendanceRate}% average
                </Badge>
              )}
              <Link to="/attendance" className="text-muted-foreground hover:text-primary hidden items-center gap-1 text-xs sm:flex">
                Open <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsQ.isLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : attendanceDays.length === 0 ? (
              <p className="text-muted-foreground py-16 text-center text-sm">No attendance marked yet</p>
            ) : (
              <BarChart
                data={attendanceDays}
                xKey="label"
                height={280}
                series={[
                  { key: 'present', label: 'Present', color: 'var(--chart-3)' },
                  { key: 'absent', label: 'Absent', color: 'var(--chart-2)' },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-3">
        {/* New admissions */}
        <Card>
          <CardHeader><CardTitle>New admissions</CardTitle></CardHeader>
          <CardContent>
            {analyticsQ.isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <BarChart data={trend} xKey="month" height={200} valueLabels series={[{ key: 'newStudents', label: 'Joined', color: 'var(--chart-1)' }]} />
            )}
          </CardContent>
        </Card>

        {/* Enquiry funnel */}
        <Card>
          <CardHeader><CardTitle>Enquiry pipeline</CardTitle></CardHeader>
          <CardContent>
            {analyticsQ.isLoading ? <Skeleton className="h-[200px] w-full" /> : <RankedBars data={a?.enquiryFunnel ?? []} />}
          </CardContent>
        </Card>

        {/* Payment mode split */}
        <Card>
          <CardHeader><CardTitle>How they paid</CardTitle></CardHeader>
          <CardContent>
            {analyticsQ.isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : modeTotal === 0 ? (
              <p className="text-muted-foreground py-12 text-center text-sm">No collections this month</p>
            ) : (
              <div className="space-y-4">
                <div className="flex h-3 overflow-hidden rounded-full">
                  <div className="bg-chart-1" style={{ width: `${(collected.cash / modeTotal) * 100}%` }} />
                  <div className="bg-chart-2" style={{ width: `${(collected.online / modeTotal) * 100}%` }} />
                </div>
                <ModeRow icon={Banknote} label="Cash" amount={collected.cash} pct={Math.round((collected.cash / modeTotal) * 100)} color="bg-chart-1" />
                <ModeRow icon={Smartphone} label="Online" amount={collected.online} pct={Math.round((collected.online / modeTotal) * 100)} color="bg-chart-2" />
                <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{currency(modeTotal)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Batch financials */}
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="p-5 pb-3">
          <CardTitle>Batch performance</CardTitle>
          <p className="text-muted-foreground mt-0.5 text-sm">Collections and allocated cost, this month</p>
        </CardHeader>
        {batchQ.isLoading ? (
          <div className="p-5"><Skeleton className="h-32 w-full" /></div>
        ) : (batchQ.data || []).length === 0 ? (
          <p className="text-muted-foreground p-10 text-center text-sm">No active batches</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="w-28">Collection</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(batchQ.data || []).map((b) => {
                  const pct = b.totalExpected ? Math.round((b.actualCollected / b.totalExpected) * 100) : 0;
                  return (
                    <TableRow key={b.batchId}>
                      <TableCell className="font-medium">{b.batchName}</TableCell>
                      <TableCell className="text-right tabular-nums">{b.totalStudents}</TableCell>
                      <TableCell className="text-right tabular-nums">{currency(b.actualCollected)}</TableCell>
                      <TableCell className="text-muted-foreground text-right tabular-nums">{currency(b.pendingExpected)}</TableCell>
                      <TableCell className="text-right tabular-nums">{currency(b.totalExpense)}</TableCell>
                      <TableCell className={cn('text-right font-semibold tabular-nums', b.actualProfit >= 0 ? 'text-success' : 'text-destructive')}>
                        {currency(b.actualProfit)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                            <div className={cn('h-full rounded-full', pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-destructive')} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-muted-foreground w-8 text-right text-xs tabular-nums">{pct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Activity lists */}
      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-3">
        <Panel title="Needs follow-up" to="/students" linkText="All students" loading={recentQ.isLoading} items={recentQ.data?.overdueStudents} empty="Everyone is up to date">
          {(s) => (
            <div key={s._id} className="flex items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
              <div className="min-w-0">
                <div className="truncate font-medium">{fullName(s.name)}</div>
                <div className="text-muted-foreground truncate text-xs">{s.batchId?.batchName || '—'} · due {formatDate(s.latestDueDate)}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-semibold tabular-nums">{currency(s.expectedAmountThisMonth)}</span>
                <StatusBadge value={s.latestPaymentStatus} />
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Recent payments" to="/fees" linkText="All fees" loading={recentQ.isLoading} items={recentQ.data?.payments} empty="No payments yet">
          {(p) => (
            <div key={p._id} className="flex items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
              <div className="min-w-0">
                <div className="truncate font-medium">{fullName(p.studentId?.name)}</div>
                <div className="text-muted-foreground truncate text-xs">{p.feeType} · {formatDate(p.paymentDate)}</div>
              </div>
              <span className="text-success shrink-0 font-semibold tabular-nums">{currency(p.amountPaid)}</span>
            </div>
          )}
        </Panel>

        <Panel title="Latest enquiries" to="/crm/enquiries" linkText="All enquiries" loading={recentQ.isLoading} items={recentQ.data?.enquiries} empty="No enquiries yet">
          {(e) => (
            <div key={e._id} className="flex items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
              <div className="min-w-0">
                <div className="truncate font-medium">{fullName(e.name)}</div>
                <div className="text-muted-foreground truncate text-xs">{e.interestedActivity || '—'} · {e.source || 'Direct'}</div>
              </div>
              <StatusBadge value={e.status} />
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-08-11' → 'Aug 11' (the API day key is already IST). */
function shortDay(day) {
  const [, m, d] = (day || '').split('-');
  return m ? `${MONTH_ABBR[Number(m) - 1]} ${Number(d)}` : day;
}

/**
 * Percentages that add up to exactly 100 (largest-remainder). Rounding each share
 * independently gave totals like 101%, which looks like a bug to anyone reading it.
 */
function withExactPercentages(rows) {
  const total = rows.reduce((s, r) => s + Number(r.count || 0), 0);
  if (!total) return rows.map((r) => ({ ...r, pct: 0 }));

  const exact = rows.map((r) => (Number(r.count || 0) / total) * 100);
  const out = rows.map((r, i) => ({ ...r, pct: Math.floor(exact[i]) }));
  let left = 100 - out.reduce((s, r) => s + r.pct, 0);

  // Hand the leftover points to whoever lost the most in the floor.
  [...exact.keys()]
    .sort((x, y) => (exact[y] - Math.floor(exact[y])) - (exact[x] - Math.floor(exact[x])))
    .forEach((i) => {
      if (left > 0) {
        out[i].pct += 1;
        left -= 1;
      }
    });
  return out;
}

/** Month-over-month change. `inverse` flips the good/bad colouring (used for expenses). */
function delta(current, previous, inverse = false) {
  if (previous === null || previous === undefined || !previous) return null;
  const pct = Math.round(((Number(current || 0) - previous) / Math.abs(previous)) * 100);
  if (!Number.isFinite(pct) || pct === 0) return null;
  return { pct, good: inverse ? pct < 0 : pct > 0 };
}

const TONE = {
  primary: { glow: 'kpi-accent', ico: 'bg-accent text-primary' },
  success: { glow: 'kpi-ok', ico: 'bg-success-soft text-success' },
  warning: { glow: 'kpi-warn', ico: 'bg-warning-soft text-warning' },
  info: { glow: 'kpi-info', ico: 'bg-info-soft text-info' },
  destructive: { glow: 'kpi-bad', ico: 'bg-destructive-soft text-destructive' },
  purple: { glow: 'kpi-purple', ico: 'bg-purple-soft text-purple' },
};

function Kpi({ label, value, delta: d, spark, sparkColor, icon: Icon, tone = 'primary', to, hint, loading, emphasis }) {
  const t = TONE[tone] ?? TONE.primary;
  const body = (
    <Card className={cn('kpi h-full gap-0 py-0', t.glow)}>
      <CardContent className="px-[17px] py-4">
        <div className="mb-3 flex items-center gap-2.5">
          <span className={cn('kpi-ico grid size-[34px] shrink-0 place-items-center rounded-[10px]', t.ico)}>
            <Icon className="size-4" />
          </span>
          <span className="text-muted-foreground text-[11.5px] font-semibold tracking-[0.3px] uppercase">{label}</span>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <div className={cn('kpi-val text-[25px] leading-[1.15] font-bold -tracking-[1px] tabular-nums', emphasis === 'negative' && 'text-destructive')}>
            {value}
          </div>
        )}
        <div className="mt-2.5 flex h-6 items-center justify-between gap-2">
          {d ? (
            <span className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs">
              <span
                className={cn(
                  'inline-flex items-center gap-[3px] rounded-full px-[7px] py-0.5 text-[11.5px] font-bold',
                  d.good ? 'bg-success-soft text-success' : 'bg-destructive-soft text-destructive',
                )}
              >
                {d.pct > 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                {Math.abs(d.pct) > 999 ? '>999' : Math.abs(d.pct)}%
              </span>
              <span className="truncate">vs last month</span>
            </span>
          ) : (
            <span className="text-muted-foreground truncate text-xs">{hint || ''}</span>
          )}
          {spark?.length > 1 && <Sparkline values={spark} color={sparkColor} />}
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}


function ModeRow({ icon: Icon, label, amount, pct, color }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={cn('size-2.5 rounded-full', color)} />
      <Icon className="text-muted-foreground size-4" />
      <span className="flex-1">{label}</span>
      <span className="text-muted-foreground text-xs tabular-nums">{pct}%</span>
      <span className="w-20 text-right font-medium tabular-nums">{currency(amount)}</span>
    </div>
  );
}

function Panel({ title, to, linkText, loading, items, empty, children }) {
  return (
    <Card className="gap-0">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {to && (
          <Link to={to} className="text-muted-foreground hover:text-primary flex items-center gap-1 text-xs">
            {linkText} <ArrowRight className="size-3" />
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3 py-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        ) : !items?.length ? (
          <p className="text-muted-foreground py-8 text-center text-sm">{empty}</p>
        ) : (
          <div>{items.slice(0, 5).map(children)}</div>
        )}
      </CardContent>
    </Card>
  );
}

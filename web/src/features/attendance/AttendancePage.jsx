import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, CheckCheck, LayoutList, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/AuthContext';
import { getAttendanceBatchSummary, getBatchRoster, markBatchAttendance, recomputeStrip } from '@/api/attendance';
import { listBatches } from '@/api/batches';
import { fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TableSkeleton } from '@/components/common/LoadingState';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormSelect, ToolbarSelect } from '@/components/forms/fields';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

const todayStr = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD (local)
const daysAgoStr = (n) => new Date(Date.now() - n * 86400000).toLocaleDateString('en-CA');
const MARK_ROLES = ['SUPER_ADMIN', 'BRANCH_ADMIN', 'STAFF', 'TEACHER'];
const ADMIN_ROLES = ['SUPER_ADMIN', 'BRANCH_ADMIN'];
const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

/** Switches between marking today's register and the per-batch rollup. */
function ViewToggle({ view, setView }) {
  return (
    <div className="bg-secondary flex rounded-[9px] p-0.5">
      {[
        { id: 'mark', label: 'Mark', icon: CheckCheck },
        { id: 'batches', label: 'By batch', icon: LayoutList },
      ].map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setView(t.id)}
          className={cn(
            'flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition-colors',
            view === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <t.icon className="size-3.5" /> {t.label}
        </button>
      ))}
    </div>
  );
}

/** Per-batch attendance rate over a date range. */
function BatchView() {
  const [days, setDays] = useState('30');
  const q = useQuery({
    queryKey: ['attendance', 'batch-summary', days],
    queryFn: () => getAttendanceBatchSummary({ from: daysAgoStr(Number(days)), to: todayStr() }),
  });

  const rows = q.data || [];
  const totals = rows.reduce(
    (t, r) => ({ present: t.present + r.present, marked: t.marked + r.marked }),
    { present: 0, marked: 0 },
  );
  const overall = totals.marked ? Math.round((totals.present / totals.marked) * 100) : null;

  const rateTone = (r) =>
    r === null ? 'muted' : r >= 85 ? 'success' : r >= 70 ? 'warning' : 'destructive';

  return (
    <>
      <Card className="mb-4 py-4">
        <div className="flex flex-wrap items-center gap-3 px-4">
          <ToolbarSelect value={days} onChange={setDays} options={RANGES} placeholder="Last 30 days" className="w-[150px]" />
          {overall !== null && (
            <div className="text-muted-foreground text-sm">
              Overall <span className="text-foreground font-semibold">{overall}%</span> across {rows.length} batches
            </div>
          )}
        </div>
      </Card>

      {q.isLoading ? (
        <Card className="py-0"><TableSkeleton cols={6} /></Card>
      ) : q.isError ? (
        <Card className="py-0"><ErrorState error={q.error} onRetry={q.refetch} /></Card>
      ) : rows.length === 0 ? (
        <Card className="py-0"><EmptyState icon={CalendarCheck} title="No active batches" /></Card>
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Present</TableHead>
                  <TableHead className="text-right">Absent</TableHead>
                  <TableHead className="w-40">Attendance rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => (
                  <TableRow key={b.batchId}>
                    <TableCell>
                      <div className="font-medium">{b.batchName}</div>
                      <div className="text-muted-foreground text-xs">
                        {b.activity}
                        {b.teacher ? ` · ${fullName(b.teacher)}` : ''}
                        {b.branch ? ` · ${b.branch}` : ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {(b.days || []).map((d) => d.slice(0, 3)).join(', ') || '—'}
                      {b.timings ? <div>{b.timings}</div> : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{b.activeStudents}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.sessions}</TableCell>
                    <TableCell className="text-success text-right font-medium tabular-nums">{b.present}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.absent}</TableCell>
                    <TableCell>
                      {b.rate === null ? (
                        <span className="text-muted-foreground text-xs">Not marked</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="bg-secondary h-1.5 flex-1 overflow-hidden rounded-full">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                b.rate >= 85 ? 'bg-success' : b.rate >= 70 ? 'bg-warning' : 'bg-destructive',
                              )}
                              style={{ width: `${b.rate}%` }}
                            />
                          </div>
                          <Badge variant={rateTone(b.rate)}>{b.rate}%</Badge>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </>
  );
}

export default function AttendancePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canMark = MARK_ROLES.includes(user?.role);
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  const [view, setView] = useState('mark');
  const [batchId, setBatchId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [marks, setMarks] = useState({});

  const batchesQ = useQuery({ queryKey: ['batches', 'lookup'], queryFn: () => listBatches({ limit: 100 }) });
  const rosterQ = useQuery({
    queryKey: ['attendance-roster', batchId, date],
    queryFn: () => getBatchRoster(batchId, date),
    enabled: !!batchId,
  });

  useEffect(() => {
    if (rosterQ.data) {
      const m = {};
      rosterQ.data.students.forEach((s) => { m[s._id] = s.status; });
      setMarks(m);
    }
  }, [rosterQ.data]);

  const students = rosterQ.data?.students || [];
  const summary = useMemo(() => {
    let present = 0, absent = 0;
    Object.values(marks).forEach((v) => { if (v === 'Present') present++; else if (v === 'Absent') absent++; });
    return { present, absent, unmarked: students.length - present - absent };
  }, [marks, students.length]);

  const setMark = (id, status) => setMarks((m) => ({ ...m, [id]: m[id] === status ? null : status }));
  const markAllPresent = () => {
    const m = {};
    students.forEach((s) => { m[s._id] = 'Present'; });
    setMarks(m);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const records = Object.entries(marks)
        .filter(([, st]) => st)
        .map(([studentId, status]) => ({ studentId, status }));
      return markBatchAttendance(batchId, date, records);
    },
    onSuccess: (r) => {
      toast.success(`Saved ${r.marked} attendance record(s)`);
      qc.invalidateQueries({ queryKey: ['attendance-roster'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const recomputeMut = useMutation({
    mutationFn: () => recomputeStrip(),
    onSuccess: (r) => toast.success(`Recomputed ${r.updated} student strip(s)`),
    onError: (e) => toast.error(e.message),
  });

  const batchOptions = (batchesQ.data?.items || []).map((b) => ({
    value: b._id,
    label: `${b.batchName}${b.branchId?.name ? ` · ${b.branchId.name}` : ''}`,
  }));

  if (view === 'batches') {
    return (
      <div>
        <PageHeader title="Attendance" description="Attendance rate by batch" actions={<ViewToggle view={view} setView={setView} />} />
        <BatchView />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Mark daily attendance by batch"
        actions={
          <>
            <ViewToggle view={view} setView={setView} />
            {isAdmin && (
              <Button variant="outline" onClick={() => recomputeMut.mutate()} disabled={recomputeMut.isPending}>
                <RefreshCw className={cn(recomputeMut.isPending && 'animate-spin')} /> Recompute strips
              </Button>
            )}
          </>
        }
      />

      <Card className="mb-4 py-4">
        <div className="flex flex-wrap items-end gap-4 px-4">
          <div className="w-72 max-w-full">
            <FormSelect label="Batch" value={batchId} onChange={setBatchId} options={batchOptions} placeholder="Select a batch…" htmlFor="att-batch" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm leading-none font-medium" htmlFor="att-date">Date</label>
            <Input id="att-date" type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      </Card>

      {!batchId ? (
        <Card className="py-0">
          <EmptyState icon={CalendarCheck} title="Select a batch" description="Choose a batch and date to mark attendance." />
        </Card>
      ) : rosterQ.isLoading ? (
        <Card className="py-0"><TableSkeleton cols={2} /></Card>
      ) : rosterQ.isError ? (
        <Card className="py-0"><ErrorState error={rosterQ.error} onRetry={rosterQ.refetch} /></Card>
      ) : students.length === 0 ? (
        <Card className="py-0"><EmptyState icon={CalendarCheck} title="No active students in this batch" /></Card>
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-success font-medium">{summary.present} present</span>
              <span className="text-destructive font-medium">{summary.absent} absent</span>
              <span className="text-muted-foreground">{summary.unmarked} unmarked</span>
            </div>
            {canMark && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={markAllPresent}><CheckCheck /> Mark all present</Button>
                <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                  {saveMut.isPending ? 'Saving…' : 'Save attendance'}
                </Button>
              </div>
            )}
          </div>
          <div className="divide-y">
            {students.map((s) => (
              <div key={s._id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full text-sm font-semibold">
                    {fullName(s.name).charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">{fullName(s.name)}</div>
                    <div className="text-muted-foreground text-xs">{s.phoneNumber || '—'}</div>
                  </div>
                  <StatusBadge value={s.studentStatus} />
                </div>
                {canMark ? (
                  <div className="flex gap-1.5">
                    {['Present', 'Absent'].map((st) => {
                      const on = marks[s._id] === st;
                      const tone = st === 'Present'
                        ? on ? 'bg-success/15 text-success border-success/40' : 'hover:bg-accent'
                        : on ? 'bg-destructive/10 text-destructive border-destructive/40' : 'hover:bg-accent';
                      return (
                        <button key={st} type="button" onClick={() => setMark(s._id, st)} className={cn('rounded-md border px-3 py-1.5 text-sm font-medium transition-colors', tone)}>
                          {st}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <StatusBadge value={marks[s._id]} />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

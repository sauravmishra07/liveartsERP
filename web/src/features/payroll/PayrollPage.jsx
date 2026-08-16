import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeIndianRupee, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/AuthContext';
import { getEmployeeRoster, markEmployeeBulk } from '@/api/employeeAttendance';
import { computePayroll, postPayroll } from '@/api/payroll';
import { currency, fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { TableSkeleton } from '@/components/common/LoadingState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ADMIN_ROLES = ['SUPER_ADMIN', 'BRANCH_ADMIN'];
const thisMonth = () => new Date().toLocaleDateString('en-CA').slice(0, 7); // YYYY-MM
const today = () => new Date().toLocaleDateString('en-CA');

export default function PayrollPage() {
  const { user } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  return (
    <div>
      <PageHeader title="Payroll" description="Monthly salary calculation and employee attendance" />
      <Tabs defaultValue="payroll">
        <TabsList>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>
        <TabsContent value="payroll"><PayrollTab isAdmin={isAdmin} /></TabsContent>
        <TabsContent value="attendance"><EmployeeAttendanceTab isAdmin={isAdmin} /></TabsContent>
      </Tabs>
    </div>
  );
}

function PayrollTab({ isAdmin }) {
  const qc = useQueryClient();
  const [month, setMonth] = useState(thisMonth());
  const q = useQuery({ queryKey: ['payroll', month], queryFn: () => computePayroll({ month: `${month}-01` }) });
  const rows = q.data?.rows || [];
  const total = rows.reduce((s, r) => s + (r.finalSalary || 0), 0);

  const postMut = useMutation({
    mutationFn: () => postPayroll({ month: `${month}-01` }),
    onSuccess: (r) => {
      toast.success(`Posted ${r.posted} salary expense(s)`);
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="pr-month">Month</label>
            <Input id="pr-month" type="month" className="w-44" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="text-sm">
            <div className="text-muted-foreground text-xs uppercase">Total payroll</div>
            <div className="text-lg font-semibold">{currency(total)}</div>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={() => postMut.mutate()} disabled={postMut.isPending || rows.length === 0}>
            {postMut.isPending ? 'Posting…' : 'Post salaries → Expenses'}
          </Button>
        )}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        {q.isLoading ? (
          <TableSkeleton cols={7} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : rows.length === 0 ? (
          <EmptyState icon={BadgeIndianRupee} title="No active employees" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">Present</TableHead>
                <TableHead className="text-right">Absent</TableHead>
                <TableHead className="text-right">Deduction</TableHead>
                <TableHead className="text-right">Incentive</TableHead>
                <TableHead className="text-right">Final salary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.employeeId}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.salaryType}</TableCell>
                  <TableCell className="text-right tabular-nums">{currency(r.base)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.presents}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.absents}</TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">−{currency(r.totalDeduction)}</TableCell>
                  <TableCell className="text-right tabular-nums">{currency(r.incentive)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{currency(r.finalSalary)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function EmployeeAttendanceTab({ isAdmin }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState({});
  const q = useQuery({ queryKey: ['emp-roster', date], queryFn: () => getEmployeeRoster(date) });
  const employees = q.data?.employees || [];

  useEffect(() => {
    if (q.data) {
      const m = {};
      q.data.employees.forEach((e) => { m[e._id] = e.status; });
      setMarks(m);
    }
  }, [q.data]);

  const setMark = (id, status) => setMarks((m) => ({ ...m, [id]: m[id] === status ? null : status }));

  const saveMut = useMutation({
    mutationFn: () => {
      const records = Object.entries(marks).filter(([, st]) => st).map(([employeeId, status]) => ({ employeeId, status }));
      return markEmployeeBulk(date, records);
    },
    onSuccess: (r) => {
      toast.success(`Saved ${r.marked} record(s)`);
      qc.invalidateQueries({ queryKey: ['emp-roster'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const STATES = [
    ['Present', 'bg-success/15 text-success border-success/40'],
    ['Absent', 'bg-destructive/10 text-destructive border-destructive/40'],
    ['Uninformed Leave', 'bg-warning/15 text-warning border-warning/40'],
  ];

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="ea-date">Date</label>
          <Input id="ea-date" type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {isAdmin && employees.length > 0 && (
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Saving…' : 'Save attendance'}
          </Button>
        )}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        {q.isLoading ? (
          <TableSkeleton cols={2} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : employees.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="No active employees" />
        ) : (
          <div className="divide-y">
            {employees.map((e) => (
              <div key={e._id} className="flex items-center justify-between gap-3 p-3">
                <div className="font-medium">{fullName(e.name)}</div>
                {isAdmin ? (
                  <div className="flex flex-wrap gap-1.5">
                    {STATES.map(([st, tone]) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setMark(e._id, st)}
                        className={cn('rounded-md border px-3 py-1.5 text-sm font-medium transition-colors', marks[e._id] === st ? tone : 'hover:bg-accent')}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">{marks[e._id] || '—'}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BadgeIndianRupee,
  BarChart3,
  Briefcase,
  CalendarCheck,
  GraduationCap,
  ReceiptText,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { getBatchSummary } from '@/api/dashboard';
import { currency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const REPORTS = [
  { to: '/students', label: 'Students', desc: 'Roster, status, payment, overdue', icon: GraduationCap, tone: 'text-primary bg-primary/10' },
  { to: '/fees', label: 'Fees', desc: 'Collections & pending dues', icon: Wallet, tone: 'text-success bg-success/10' },
  { to: '/attendance', label: 'Attendance', desc: 'By batch and date', icon: CalendarCheck, tone: 'text-info bg-info/10' },
  { to: '/employees', label: 'Employees', desc: 'Staff & salary profiles', icon: Briefcase, tone: 'text-warning bg-warning/15' },
  { to: '/payroll', label: 'Payroll', desc: 'Monthly salary calculation', icon: BadgeIndianRupee, tone: 'text-primary bg-primary/10' },
  { to: '/expenses', label: 'Expenses', desc: 'Costs, salaries, recurring', icon: ReceiptText, tone: 'text-destructive bg-destructive/10' },
  { to: '/crm/enquiries', label: 'CRM', desc: 'Enquiries, demos, follow-ups', icon: UserPlus, tone: 'text-info bg-info/10' },
];

export default function ReportsPage() {
  const batchQ = useQuery({ queryKey: ['dash', 'batch-summary'], queryFn: () => getBatchSummary() });

  return (
    <div>
      <PageHeader title="Reports" description="Financial and operational reports" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.to} to={r.to}>
            <Card className="gap-0 py-0 transition hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-lg', r.tone)}>
                  <r.icon className="size-5" />
                </div>
                <div>
                  <div className="font-medium">{r.label}</div>
                  <div className="text-muted-foreground text-xs">{r.desc}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6 gap-0 overflow-hidden py-0">
        <CardHeader className="p-4 pb-0"><CardTitle className="flex items-center gap-2"><BarChart3 className="size-4" /> Batch-wise financial report</CardTitle></CardHeader>
        {batchQ.isLoading ? (
          <div className="p-4"><Skeleton className="h-24 w-full" /></div>
        ) : (batchQ.data || []).length === 0 ? (
          <div className="text-muted-foreground p-8 text-center text-sm">No active batches yet</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Will pay</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Expense</TableHead>
                <TableHead className="text-right">Exp. profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(batchQ.data || []).map((b) => (
                <TableRow key={b.batchId}>
                  <TableCell className="font-medium">{b.batchName}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.totalStudents}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.willPay}</TableCell>
                  <TableCell className="text-right tabular-nums">{currency(b.actualCollected)}</TableCell>
                  <TableCell className="text-right tabular-nums">{currency(b.pendingExpected)}</TableCell>
                  <TableCell className="text-right tabular-nums">{currency(b.totalExpense)}</TableCell>
                  <TableCell className={cn('text-right font-medium tabular-nums', b.expectedProfit >= 0 ? 'text-success' : 'text-destructive')}>{currency(b.expectedProfit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

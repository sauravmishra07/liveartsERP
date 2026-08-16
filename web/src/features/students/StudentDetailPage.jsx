import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/AuthContext';
import { listBatches } from '@/api/batches';
import {
  changeStudentBatch,
  getStudent,
  getStudentChangeHistory,
  setStudentBreak,
  updateStudentStatus,
} from '@/api/students';
import { CAN_EDIT_STUDENTS, STUDENT_STATUS } from '@/constants/enums';
import { currency, formatDate, fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Field, FormSelect, FormTextarea } from '@/components/forms/fields';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StudentForm from './StudentForm';

const STRIP = [
  ['-7d', 'days7ago'], ['-6d', 'days6ago'], ['-5d', 'days5ago'], ['-4d', 'days4ago'],
  ['-3d', 'days3ago'], ['Yst', 'yesterday'], ['Today', 'today'],
];
const MARK = {
  P: 'bg-success/15 text-success border-success/30',
  A: 'bg-destructive/10 text-destructive border-destructive/30',
  '!': 'bg-warning/15 text-warning border-warning/30',
};

function Row({ k, children }) {
  return (
    <div className="flex border-b py-2 last:border-0">
      <div className="text-muted-foreground w-44 shrink-0 text-sm">{k}</div>
      <div className="text-sm">{children ?? '—'}</div>
    </div>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = CAN_EDIT_STUDENTS.includes(user?.role);
  const [modal, setModal] = useState(null);

  const q = useQuery({ queryKey: ['student', id], queryFn: () => getStudent(id) });
  const historyQ = useQuery({ queryKey: ['student-history', id], queryFn: () => getStudentChangeHistory(id) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['student', id] });
    qc.invalidateQueries({ queryKey: ['student-history', id] });
    qc.invalidateQueries({ queryKey: ['students'] });
  };

  if (q.isLoading) return <LoadingState full />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const s = q.data;
  const onBreak = s.studentStatus === 'On Break';
  const name = fullName(s.name);

  return (
    <div>
      <Link to="/students" className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" /> Students
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            <AvatarFallback className="bg-primary text-primary-foreground">{name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold">{name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge value={s.studentStatus} />
              <StatusBadge value={s.activeStatus} />
              {s.batchId?.batchName && <span className="text-muted-foreground text-sm">{s.batchId.batchName}</span>}
            </div>
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setModal('status')}>Change Status</Button>
            <Button variant="outline" size="sm" onClick={() => setModal('batch')}>Change Batch</Button>
            <Button variant="outline" size="sm" onClick={() => setModal('break')}>{onBreak ? 'Clear Break' : 'Set On Break'}</Button>
            <Button size="sm" onClick={() => setModal('edit')}><Pencil /> Edit</Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="history">Change History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
              <CardContent>
                <Row k="Form No.">{s.formNo}</Row>
                <Row k="Phone">{s.phoneNumber}</Row>
                <Row k="Gender">{s.gender}</Row>
                <Row k="Date of birth">{s.dateOfBirth ? `${formatDate(s.dateOfBirth)}${s.age ? ` (${s.age})` : ''}` : '—'}</Row>
                <Row k="Joining date">{formatDate(s.joiningDate)}</Row>
                <Row k="Branch">{s.branchId?.name}</Row>
                <Row k="Guardian">{s.guardianName ? `${s.guardianName}${s.guardianRelation ? ` (${s.guardianRelation})` : ''}` : '—'}</Row>
                <Row k="Primary contact">{s.primaryContactPerson}</Row>
                <Row k="Address">{s.address}</Row>
                <Row k="Instagram">{s.instagram}</Row>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Fee state <span className="text-muted-foreground text-xs font-normal">· system-managed</span></CardTitle></CardHeader>
              <CardContent>
                <Row k="Preferred package">{s.preferredFeePackage}</Row>
                <Row k="Latest payment status"><StatusBadge value={s.latestPaymentStatus} /></Row>
                <Row k="Latest due date">{formatDate(s.latestDueDate)}</Row>
                <Row k="Balance">{currency(s.balance)}</Row>
                <Row k="Overdue this month"><StatusBadge value={s.overdueThisMonth} /></Row>
                <Row k="Expected this month">{currency(s.expectedAmountThisMonth)}</Row>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fees">
          <Card>
            <CardHeader><CardTitle>Fees</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div><div className="text-muted-foreground text-xs uppercase">Balance</div><div className="text-lg font-semibold">{currency(s.balance)}</div></div>
                <div><div className="text-muted-foreground text-xs uppercase">Payment status</div><div className="mt-1"><StatusBadge value={s.latestPaymentStatus} /></div></div>
                <div><div className="text-muted-foreground text-xs uppercase">Due date</div><div className="text-lg font-semibold">{formatDate(s.latestDueDate)}</div></div>
                <div><div className="text-muted-foreground text-xs uppercase">Expected this month</div><div className="text-lg font-semibold">{currency(s.expectedAmountThisMonth)}</div></div>
              </div>
              <p className="text-muted-foreground text-sm">Fee-payment history and collection land with the Fees engine (Phase 5). These values are computed server-side.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle>Last 7 days</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {STRIP.map(([label, key]) => {
                  const v = s[key];
                  return (
                    <div key={key} className="text-center">
                      <div className={cn('flex size-10 items-center justify-center rounded-md border text-sm font-bold', MARK[v] || 'bg-muted text-muted-foreground')}>
                        {v || '·'}
                      </div>
                      <div className="text-muted-foreground mt-1 text-[10px]">{label}</div>
                    </div>
                  );
                })}
              </div>
              <p className="text-muted-foreground mt-4 text-xs">P present · A absent · ! scheduled-unmarked · · none. Populated by the daily attendance job (Phase 4).</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="gap-0 overflow-hidden py-0">
            {historyQ.isLoading ? (
              <div className="p-6"><LoadingState /></div>
            ) : (historyQ.data || []).length === 0 ? (
              <div className="text-muted-foreground p-8 text-center text-sm">No changes recorded yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Old</TableHead>
                    <TableHead>New</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(historyQ.data || []).map((h) => (
                    <TableRow key={h._id}>
                      <TableCell>{formatDate(h.changeDate)}</TableCell>
                      <TableCell>{h.fieldChanged}</TableCell>
                      <TableCell className="text-muted-foreground">{h.oldValue || '—'}</TableCell>
                      <TableCell className="font-medium">{h.newValue || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {modal === 'edit' && (
        <StudentForm student={s} canPickBranch={user?.role === 'SUPER_ADMIN'} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
      )}
      {modal === 'status' && <StatusDialog student={s} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal === 'batch' && <BatchDialog student={s} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
      {modal === 'break' && <BreakDialog student={s} onBreak={onBreak} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />}
    </div>
  );
}

function StatusDialog({ student, onClose, onSaved }) {
  const [status, setStatus] = useState(student.studentStatus);
  const [remarks, setRemarks] = useState('');
  const mut = useMutation({
    mutationFn: () => updateStudentStatus(student._id, { studentStatus: status, remarks: remarks || undefined }),
    onSuccess: () => { toast.success('Status updated'); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Change Status</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4">
          <FormSelect label="Student status" value={status} onChange={setStatus} options={STUDENT_STATUS} />
          <FormTextarea label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={mut.isPending} onClick={() => mut.mutate()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BatchDialog({ student, onClose, onSaved }) {
  const batchesQ = useQuery({ queryKey: ['batches', 'lookup'], queryFn: () => listBatches({ limit: 100 }) });
  const [batchId, setBatchId] = useState(student.batchId?._id || '');
  const mut = useMutation({
    mutationFn: () => changeStudentBatch(student._id, batchId),
    onSuccess: () => { toast.success('Batch changed'); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Change Batch</DialogTitle></DialogHeader>
        <FormSelect
          label="Batch"
          value={batchId}
          onChange={setBatchId}
          options={(batchesQ.data?.items || []).map((b) => ({ value: b._id, label: b.batchName }))}
          placeholder="Select batch…"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!batchId || mut.isPending} onClick={() => mut.mutate()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BreakDialog({ student, onBreak, onClose, onSaved }) {
  const [remarks, setRemarks] = useState('');
  const mut = useMutation({
    mutationFn: () => setStudentBreak(student._id, !onBreak, remarks || undefined),
    onSuccess: () => { toast.success(onBreak ? 'Break cleared' : 'Marked on break'); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{onBreak ? 'Clear Break' : 'Set On Break'}</DialogTitle></DialogHeader>
        <p className="text-muted-foreground text-sm">
          {onBreak ? 'This moves the student back to Regular.' : 'This marks the student as On Break.'}
        </p>
        <FormTextarea label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={mut.isPending} onClick={() => mut.mutate()}>{onBreak ? 'Clear Break' : 'Set On Break'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

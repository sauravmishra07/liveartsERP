import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/AuthContext';
import { listStudents, recomputeStudentStatus } from '@/api/students';
import { cn } from '@/lib/utils';
import { ACTIVE_STATUS, CAN_EDIT_STUDENTS, LATEST_PAYMENT_STATUS, STUDENT_STATUS } from '@/constants/enums';
import { fullName } from '@/lib/format';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { ToolbarSelect } from '@/components/forms/fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePagedList } from '../shared/usePagedList';
import StudentForm from './StudentForm';

export default function StudentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canEdit = CAN_EDIT_STUDENTS.includes(user?.role);
  const isAdmin = ['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(user?.role);
  const [adding, setAdding] = useState(false);
  const recomputeMut = useMutation({
    mutationFn: () => recomputeStudentStatus(),
    onSuccess: (r) => {
      toast.success(`Recomputed ${r.processed} student(s) — ${r.changed} status change(s)`);
      qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e) => toast.error(e.message),
  });
  const { q, searchRaw, setSearchRaw, filters, setFilter, setPage } = usePagedList('students', listStudents);
  const data = q.data;

  const columns = [
    { key: 'name', header: 'Name', render: (s) => <span className="font-medium">{fullName(s.name)}</span> },
    { key: 'phone', header: 'Phone', render: (s) => s.phoneNumber || '—' },
    { key: 'batch', header: 'Batch', render: (s) => s.batchId?.batchName || '—' },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge value={s.studentStatus} /> },
    { key: 'payment', header: 'Payment', render: (s) => <StatusBadge value={s.latestPaymentStatus} /> },
    { key: 'branch', header: 'Branch', render: (s) => s.branchId?.name || '—' },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Input className="h-8 max-w-xs" placeholder="Search name or phone…" value={searchRaw} onChange={(e) => setSearchRaw(e.target.value)} />
      <ToolbarSelect value={filters.activeStatus} onChange={(v) => setFilter('activeStatus', v)} options={ACTIVE_STATUS} placeholder="All" className="w-28" />
      <ToolbarSelect value={filters.studentStatus} onChange={(v) => setFilter('studentStatus', v)} options={STUDENT_STATUS} placeholder="Any status" className="w-44" />
      <ToolbarSelect value={filters.latestPaymentStatus} onChange={(v) => setFilter('latestPaymentStatus', v)} options={LATEST_PAYMENT_STATUS} placeholder="Any payment" className="w-44" />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Students"
        description={`${data?.meta?.total ?? '…'} students`}
        actions={
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => recomputeMut.mutate()} disabled={recomputeMut.isPending}>
                <RefreshCw className={cn(recomputeMut.isPending && 'animate-spin')} /> Recompute statuses
              </Button>
            )}
            {canEdit && <Button onClick={() => setAdding(true)}><Plus /> Add Student</Button>}
          </div>
        }
      />
      <DataTable
        columns={columns}
        rows={data?.items || []}
        loading={q.isLoading}
        error={q.isError ? q.error : null}
        onRetry={q.refetch}
        empty={<EmptyState icon={GraduationCap} title="No students found" description={canEdit ? 'Add your first student to get started.' : undefined} />}
        meta={data?.meta}
        onPage={setPage}
        toolbar={toolbar}
        onRowClick={(s) => navigate(`/students/${s._id}`)}
      />
      {adding && (
        <StudentForm
          canPickBranch={user?.role === 'SUPER_ADMIN'}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            qc.invalidateQueries({ queryKey: ['students'] });
          }}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/AuthContext';
import { getPendingFees, listFees, recomputeFees } from '@/api/fees';
import { CAN_EDIT_STUDENTS, FEE_TYPE } from '@/constants/enums';
import { currency, formatDate, fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { ToolbarSelect } from '@/components/forms/fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePagedList } from '../shared/usePagedList';
import CollectFeeDialog from './CollectFeeDialog';

const ADMIN_ROLES = ['SUPER_ADMIN', 'BRANCH_ADMIN'];

export default function FeesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canCollect = CAN_EDIT_STUDENTS.includes(user?.role);
  const isAdmin = ADMIN_ROLES.includes(user?.role);
  const [collecting, setCollecting] = useState(null); // null | {} (picker) | student

  const recomputeMut = useMutation({
    mutationFn: () => recomputeFees(),
    onSuccess: (r) => {
      toast.success(`Recomputed ${r.updated} student(s)`);
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Fees"
        description="Collections and outstanding dues"
        actions={
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => recomputeMut.mutate()} disabled={recomputeMut.isPending}>
                <RefreshCw className={cn(recomputeMut.isPending && 'animate-spin')} /> Recompute
              </Button>
            )}
            {canCollect && <Button onClick={() => setCollecting({})}><Plus /> Collect Fee</Button>}
          </div>
        }
      />

      <Tabs defaultValue="collections">
        <TabsList>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>
        <TabsContent value="collections"><CollectionsTab /></TabsContent>
        <TabsContent value="pending"><PendingTab onCollect={canCollect ? setCollecting : undefined} /></TabsContent>
      </Tabs>

      {collecting && (
        <CollectFeeDialog
          student={collecting._id ? collecting : undefined}
          onClose={() => setCollecting(null)}
          onCollected={() => qc.invalidateQueries()}
        />
      )}
    </div>
  );
}

function CollectionsTab() {
  const { q, searchRaw, setSearchRaw, filters, setFilter, setPage } = usePagedList('fees', listFees);
  const data = q.data;
  const columns = [
    { key: 'student', header: 'Student', render: (r) => <span className="font-medium">{fullName(r.studentId?.name)}</span> },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.paymentDate) },
    { key: 'feeType', header: 'Type' },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => currency(r.amount) },
    { key: 'paid', header: 'Paid', align: 'right', render: (r) => currency(r.amountPaid) },
    { key: 'balance', header: 'Balance', align: 'right', render: (r) => currency(r.balance) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.paymentStatus === 'Paid or Cleared' ? 'Paid' : r.paymentStatus} /> },
    { key: 'mode', header: 'Mode', render: (r) => (r.modeOfPayment || []).join(', ') || '—' },
  ];
  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <ToolbarSelect value={filters.feeType} onChange={(v) => setFilter('feeType', v)} options={FEE_TYPE} placeholder="All types" className="w-40" />
    </div>
  );
  return (
    <DataTable
      columns={columns}
      rows={data?.items || []}
      loading={q.isLoading}
      error={q.isError ? q.error : null}
      onRetry={q.refetch}
      empty={<EmptyState icon={Wallet} title="No fee collections yet" />}
      meta={data?.meta}
      onPage={setPage}
      toolbar={toolbar}
    />
  );
}

function PendingTab({ onCollect }) {
  const { q, setPage } = usePagedList('fees-pending', getPendingFees);
  const data = q.data;
  const columns = [
    { key: 'student', header: 'Student', render: (s) => <span className="font-medium">{fullName(s.name)}</span> },
    { key: 'batch', header: 'Batch', render: (s) => s.batchId?.batchName || '—' },
    { key: 'payment', header: 'Payment', render: (s) => <StatusBadge value={s.latestPaymentStatus} /> },
    { key: 'due', header: 'Due date', render: (s) => formatDate(s.latestDueDate) },
    { key: 'balance', header: 'Balance', align: 'right', render: (s) => currency(s.balance) },
    { key: 'expected', header: 'Expected', align: 'right', render: (s) => currency(s.expectedAmountThisMonth) },
  ];
  if (onCollect) {
    columns.push({
      key: 'action',
      header: '',
      align: 'right',
      render: (s) => (
        <Button size="sm" variant="outline" onClick={() => onCollect(s)}>Collect</Button>
      ),
    });
  }
  return (
    <DataTable
      columns={columns}
      rows={data?.items || []}
      loading={q.isLoading}
      error={q.isError ? q.error : null}
      onRetry={q.refetch}
      empty={<EmptyState icon={Wallet} title="No pending dues" description="Everyone is paid up." />}
      meta={data?.meta}
      onPage={setPage}
    />
  );
}

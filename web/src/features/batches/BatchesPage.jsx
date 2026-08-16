import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/AuthContext';
import { createBatch, listBatches, updateBatch } from '@/api/batches';
import { listBranches } from '@/api/branches';
import { listEmployees } from '@/api/employees';
import { ACTIVITY, BATCH_STATUS, CAN_EDIT_CORE, WEEKDAYS } from '@/constants/enums';
import { currency, fullName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Field, FormSelect, ToolbarSelect } from '@/components/forms/fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { usePagedList } from '../shared/usePagedList';

export default function BatchesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = CAN_EDIT_CORE.includes(user?.role);
  const [editing, setEditing] = useState(null);
  const { q, searchRaw, setSearchRaw, filters, setFilter, setPage } = usePagedList('batches', listBatches);
  const data = q.data;

  const columns = [
    { key: 'batchName', header: 'Batch', render: (b) => <span className="font-medium">{b.batchName}</span> },
    { key: 'branch', header: 'Branch', render: (b) => b.branchId?.name || '—' },
    { key: 'activity', header: 'Activity' },
    { key: 'days', header: 'Days', render: (b) => (b.days || []).map((d) => d.slice(0, 3)).join(', ') || '—' },
    { key: 'timings', header: 'Timings', render: (b) => b.timings || '—' },
    { key: 'monthlyFee', header: 'Monthly Fee', align: 'right', render: (b) => currency(b.monthlyFee) },
    { key: 'status', header: 'Status', render: (b) => <StatusBadge value={b.status} /> },
  ];
  if (canEdit) {
    columns.push({
      key: 'actions',
      header: '',
      align: 'right',
      render: (b) => (
        <Button variant="ghost" size="sm" onClick={() => setEditing(b)}>
          Edit
        </Button>
      ),
    });
  }

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Input className="h-8 max-w-xs" placeholder="Search batch name…" value={searchRaw} onChange={(e) => setSearchRaw(e.target.value)} />
      <ToolbarSelect value={filters.activity} onChange={(v) => setFilter('activity', v)} options={ACTIVITY} placeholder="All activities" className="w-44" />
      <ToolbarSelect value={filters.status} onChange={(v) => setFilter('status', v)} options={BATCH_STATUS} placeholder="All status" className="w-36" />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Batches"
        description={`${data?.meta?.total ?? '…'} batches`}
        actions={canEdit && <Button onClick={() => setEditing({})}><Plus /> Add Batch</Button>}
      />
      <DataTable
        columns={columns}
        rows={data?.items || []}
        loading={q.isLoading}
        error={q.isError ? q.error : null}
        onRetry={q.refetch}
        empty={<EmptyState icon={CalendarDays} title="No batches found" />}
        meta={data?.meta}
        onPage={setPage}
        toolbar={toolbar}
      />
      {editing && (
        <BatchDialog
          batch={editing}
          canPickBranch={user?.role === 'SUPER_ADMIN'}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['batches'] });
          }}
        />
      )}
    </div>
  );
}

function BatchDialog({ batch, canPickBranch, onClose, onSaved }) {
  const isNew = !batch._id;
  const branchesQ = useQuery({ queryKey: ['branches'], queryFn: listBranches, enabled: canPickBranch });
  const teachersQ = useQuery({ queryKey: ['employees', 'lookup'], queryFn: () => listEmployees({ limit: 100 }) });
  const [form, setForm] = useState({
    batchName: batch.batchName || '',
    branchId: batch.branchId?._id || batch.branchId || '',
    activity: batch.activity || '',
    status: batch.status || 'Active',
    timings: batch.timings || '',
    days: batch.days || [],
    teacherId: batch.teacherId?._id || batch.teacherId || '',
    teacherPhone: batch.teacherPhone || '',
    monthlyFee: batch.monthlyFee ?? '',
    packageFee: batch.packageFee ?? '',
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const pick = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleDay = (d) =>
    setForm((f) => ({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] }));

  const mut = useMutation({
    mutationFn: (body) => (isNew ? createBatch(body) : updateBatch(batch._id, body)),
    onSuccess: () => {
      toast.success(isNew ? 'Batch created' : 'Batch updated');
      onSaved();
    },
    onError: (e) => {
      setError(e.message);
      toast.error(e.message);
    },
  });

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.batchName.trim()) return setError('Batch name is required');
    if (!form.activity) return setError('Activity is required');
    if (canPickBranch && !form.branchId) return setError('Select a branch');
    mut.mutate({
      batchName: form.batchName.trim(),
      branchId: canPickBranch ? form.branchId : undefined,
      activity: form.activity,
      status: form.status,
      timings: form.timings || undefined,
      days: form.days,
      teacherId: form.teacherId || undefined,
      teacherPhone: form.teacherPhone || undefined,
      monthlyFee: form.monthlyFee === '' ? undefined : Number(form.monthlyFee),
      packageFee: form.packageFee === '' ? undefined : Number(form.packageFee),
    });
  };

  const teacherOptions = (teachersQ.data?.items || []).map((t) => ({ value: t._id, label: fullName(t.name) }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add Batch' : 'Edit Batch'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Batch name" required htmlFor="ba-name">
            <Input id="ba-name" value={form.batchName} onChange={set('batchName')} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            {canPickBranch && (
              <FormSelect label="Branch" required value={form.branchId} onChange={pick('branchId')} options={(branchesQ.data || []).map((b) => ({ value: b._id, label: b.name }))} placeholder="Select branch…" />
            )}
            <FormSelect label="Activity" required value={form.activity} onChange={pick('activity')} options={ACTIVITY} />
            <FormSelect label="Status" value={form.status} onChange={pick('status')} options={BATCH_STATUS} />
            <Field label="Timings" htmlFor="ba-timings">
              <Input id="ba-timings" value={form.timings} onChange={set('timings')} placeholder="5:00 PM - 6:00 PM" />
            </Field>
          </div>
          <Field label="Days">
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d) => {
                const on = form.days.includes(d);
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleDay(d)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                      on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent',
                    )}
                  >
                    {d.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Teacher" value={form.teacherId} onChange={pick('teacherId')} options={teacherOptions} placeholder="Unassigned" allowClear />
            <Field label="Teacher phone" htmlFor="ba-tphone">
              <Input id="ba-tphone" value={form.teacherPhone} onChange={set('teacherPhone')} />
            </Field>
            <Field label="Monthly fee" htmlFor="ba-mfee">
              <Input id="ba-mfee" type="number" value={form.monthlyFee} onChange={set('monthlyFee')} />
            </Field>
            <Field label="Package fee" htmlFor="ba-pfee">
              <Input id="ba-pfee" type="number" value={form.packageFee} onChange={set('packageFee')} />
            </Field>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? 'Saving…' : isNew ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

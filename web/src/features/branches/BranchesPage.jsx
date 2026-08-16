import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/AuthContext';
import { createBranch, listBranches, updateBranch } from '@/api/branches';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Field, FormSelect } from '@/components/forms/fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function BranchesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = user?.role === 'SUPER_ADMIN';
  const [editing, setEditing] = useState(null);
  const q = useQuery({ queryKey: ['branches'], queryFn: listBranches });
  const rows = q.data || [];

  const columns = [
    { key: 'name', header: 'Name', render: (b) => <span className="font-medium">{b.name}</span> },
    { key: 'code', header: 'Code', render: (b) => b.code || '—' },
    { key: 'phone', header: 'Phone', render: (b) => b.phone || '—' },
    { key: 'status', header: 'Status', render: (b) => <StatusBadge value={b.isActive ? 'Active' : 'Inactive'} /> },
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

  return (
    <div>
      <PageHeader
        title="Branches"
        description={`${rows.length} branch(es)`}
        actions={canEdit && <Button onClick={() => setEditing({})}><Plus /> Add Branch</Button>}
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={q.isLoading}
        error={q.isError ? q.error : null}
        onRetry={q.refetch}
        empty={<EmptyState icon={Building2} title="No branches yet" />}
      />
      {editing && (
        <BranchDialog
          branch={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['branches'] });
          }}
        />
      )}
    </div>
  );
}

function BranchDialog({ branch, onClose, onSaved }) {
  const isNew = !branch._id;
  const [form, setForm] = useState({
    name: branch.name || '',
    code: branch.code || '',
    address: branch.address || '',
    phone: branch.phone || '',
    isActive: branch.isActive ?? true,
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const mut = useMutation({
    mutationFn: (body) => (isNew ? createBranch(body) : updateBranch(branch._id, body)),
    onSuccess: () => {
      toast.success(isNew ? 'Branch created' : 'Branch updated');
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
    if (!form.name.trim()) return setError('Name is required');
    mut.mutate({
      name: form.name.trim(),
      code: form.code || undefined,
      address: form.address || undefined,
      phone: form.phone || undefined,
      isActive: form.isActive,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add Branch' : 'Edit Branch'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Name" required htmlFor="b-name">
            <Input id="b-name" value={form.name} onChange={set('name')} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code" htmlFor="b-code">
              <Input id="b-code" value={form.code} onChange={set('code')} />
            </Field>
            <Field label="Phone" htmlFor="b-phone">
              <Input id="b-phone" value={form.phone} onChange={set('phone')} />
            </Field>
          </div>
          <Field label="Address" htmlFor="b-addr">
            <Input id="b-addr" value={form.address} onChange={set('address')} />
          </Field>
          <FormSelect
            label="Status"
            htmlFor="b-status"
            value={form.isActive ? 'Active' : 'Inactive'}
            onChange={(v) => setForm((f) => ({ ...f, isActive: v === 'Active' }))}
            options={['Active', 'Inactive']}
          />
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

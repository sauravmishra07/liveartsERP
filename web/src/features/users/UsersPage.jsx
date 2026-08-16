import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { listBranches } from '@/api/branches';
import { createUser, listUsers } from '@/api/users';
import { ROLES } from '@/constants/enums';
import { roleLabel } from '@/lib/format';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Field, FormSelect } from '@/components/forms/fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function UsersPage() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const q = useQuery({ queryKey: ['users'], queryFn: listUsers });
  const rows = q.data || [];

  const columns = [
    { key: 'name', header: 'Name', render: (u) => <span className="font-medium">{u.name}</span> },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (u) => roleLabel(u.role) },
    { key: 'branch', header: 'Branch', render: (u) => u.branchId?.name || (u.role === 'SUPER_ADMIN' ? 'All' : '—') },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge value={u.isActive ? 'Active' : 'Inactive'} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${rows.length} user(s)`}
        actions={<Button onClick={() => setAdding(true)}><Plus /> Add User</Button>}
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={q.isLoading}
        error={q.isError ? q.error : null}
        onRetry={q.refetch}
        empty={<EmptyState icon={KeyRound} title="No users" />}
      />
      {adding && (
        <UserDialog
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            qc.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}
    </div>
  );
}

function UserDialog({ onClose, onSaved }) {
  const branchesQ = useQuery({ queryKey: ['branches'], queryFn: listBranches });
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STAFF', branchId: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const needsBranch = form.role !== 'SUPER_ADMIN';

  const mut = useMutation({
    mutationFn: (body) => createUser(body),
    onSuccess: () => {
      toast.success('User created');
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
    if (!form.name.trim() || !form.email.trim() || !form.password) return setError('Name, email and password are required');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    if (needsBranch && !form.branchId) return setError('Select a branch for this role');
    mut.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
      branchId: needsBranch ? form.branchId : undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Name" required htmlFor="u-name">
            <Input id="u-name" value={form.name} onChange={set('name')} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" required htmlFor="u-email">
              <Input id="u-email" type="email" value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Password" required htmlFor="u-pass">
              <Input id="u-pass" type="password" value={form.password} onChange={set('password')} placeholder="min 8 chars" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Role"
              required
              htmlFor="u-role"
              value={form.role}
              onChange={(v) => setForm((f) => ({ ...f, role: v }))}
              options={ROLES.map((r) => ({ value: r, label: roleLabel(r) }))}
            />
            {needsBranch && (
              <FormSelect
                label="Branch"
                required
                htmlFor="u-branch"
                value={form.branchId}
                onChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
                options={(branchesQ.data || []).map((b) => ({ value: b._id, label: b.name }))}
                placeholder="Select branch…"
              />
            )}
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? 'Saving…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

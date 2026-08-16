import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ReceiptText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/AuthContext';
import { createExpense, deleteExpense, generateRecurring, listExpenses, updateExpense } from '@/api/expenses';
import { listBranches } from '@/api/branches';
import { EXPENSE_REF_TYPE, EXPENSE_STATUS, EXPENSE_TYPE } from '@/constants/enums';
import { currency, formatDate } from '@/lib/format';
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

const ADMIN_ROLES = ['SUPER_ADMIN', 'BRANCH_ADMIN'];

export default function ExpensesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = ADMIN_ROLES.includes(user?.role);
  const [editing, setEditing] = useState(null);
  const { q, searchRaw, setSearchRaw, filters, setFilter, setPage } = usePagedList('expenses', listExpenses);
  const data = q.data;

  const genMut = useMutation({
    mutationFn: () => generateRecurring(),
    onSuccess: (r) => {
      toast.success(`Generated ${r.created} recurring expense(s)`);
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (e) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id) => deleteExpense(id),
    onSuccess: () => {
      toast.success('Expense deleted');
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const columns = [
    { key: 'title', header: 'Expense', render: (e) => <span className="font-medium">{e.title}</span> },
    { key: 'type', header: 'Type', render: (e) => e.expenseType },
    { key: 'amount', header: 'Amount', align: 'right', render: (e) => currency(e.amount || e.expectedExpense) },
    { key: 'status', header: 'Status', render: (e) => <StatusBadge value={e.expenseStatus} /> },
    { key: 'date', header: 'From', render: (e) => formatDate(e.fromDate) },
  ];
  if (canEdit) {
    columns.push({
      key: 'actions',
      header: '',
      align: 'right',
      render: (e) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(e)}>Edit</Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => delMut.mutate(e._id)}>Delete</Button>
        </div>
      ),
    });
  }

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Input className="h-8 max-w-xs" placeholder="Search expense…" value={searchRaw} onChange={(e) => setSearchRaw(e.target.value)} />
      <ToolbarSelect value={filters.expenseType} onChange={(v) => setFilter('expenseType', v)} options={EXPENSE_TYPE} placeholder="All types" className="w-40" />
      <ToolbarSelect value={filters.expenseStatus} onChange={(v) => setFilter('expenseStatus', v)} options={EXPENSE_STATUS} placeholder="All status" className="w-36" />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Branch expenses, salaries and recurring costs"
        actions={
          canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => genMut.mutate()} disabled={genMut.isPending}>
                <RefreshCw className={cn(genMut.isPending && 'animate-spin')} /> Generate recurring
              </Button>
              <Button onClick={() => setEditing({})}><Plus /> Add Expense</Button>
            </div>
          )
        }
      />
      <DataTable
        columns={columns}
        rows={data?.items || []}
        loading={q.isLoading}
        error={q.isError ? q.error : null}
        onRetry={q.refetch}
        empty={<EmptyState icon={ReceiptText} title="No expenses yet" />}
        meta={data?.meta}
        onPage={setPage}
        toolbar={toolbar}
      />
      {editing && (
        <ExpenseDialog
          expense={editing}
          canPickBranch={user?.role === 'SUPER_ADMIN'}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['expenses'] });
          }}
        />
      )}
    </div>
  );
}

function ExpenseDialog({ expense, canPickBranch, onClose, onSaved }) {
  const isNew = !expense._id;
  const branchesQ = useQuery({ queryKey: ['branches'], queryFn: listBranches, enabled: canPickBranch });
  const [f, setF] = useState({
    title: expense.title || '',
    expenseType: expense.expenseType || 'One-time',
    expenseStatus: expense.expenseStatus || 'Unpaid',
    amount: expense.amount ?? '',
    fromDate: expense.fromDate ? String(expense.fromDate).slice(0, 10) : new Date().toLocaleDateString('en-CA'),
    toDate: expense.toDate ? String(expense.toDate).slice(0, 10) : '',
    autoAdd: expense.autoAdd ?? false,
    reoccurringFrequency: expense.reoccurringFrequency ?? '',
    deriveExpectedExpenseFrom: expense.deriveExpectedExpenseFrom || 'Last Expense',
    branchId: expense.branchId?._id || expense.branchId || '',
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const pick = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const num = (v) => (v === '' ? undefined : Number(v));

  const mut = useMutation({
    mutationFn: (body) => (isNew ? createExpense(body) : updateExpense(expense._id, body)),
    onSuccess: () => {
      toast.success(isNew ? 'Expense added' : 'Expense updated');
      onSaved();
    },
    onError: (e) => {
      setError(e.message);
      toast.error(e.message);
    },
  });

  const isRecurring = f.expenseType === 'Reoccurring';

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!f.title.trim()) return setError('Title is required');
    if (canPickBranch && isNew && !f.branchId) return setError('Select a branch');
    const body = {
      title: f.title.trim(),
      expenseType: f.expenseType,
      expenseStatus: f.expenseStatus,
      amount: num(f.amount),
      fromDate: f.fromDate || undefined,
      toDate: f.toDate || undefined,
      autoAdd: isRecurring ? f.autoAdd : false,
      reoccurringFrequency: isRecurring ? num(f.reoccurringFrequency) : undefined,
      deriveExpectedExpenseFrom: isRecurring ? f.deriveExpectedExpenseFrom : undefined,
    };
    if (isNew && canPickBranch) body.branchId = f.branchId;
    mut.mutate(body);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add Expense' : 'Edit Expense'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Title" required htmlFor="ex-title"><Input id="ex-title" value={f.title} onChange={set('title')} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Type" value={f.expenseType} onChange={pick('expenseType')} options={EXPENSE_TYPE} />
            <FormSelect label="Status" value={f.expenseStatus} onChange={pick('expenseStatus')} options={EXPENSE_STATUS} />
            <Field label="Amount" htmlFor="ex-amount"><Input id="ex-amount" type="number" value={f.amount} onChange={set('amount')} /></Field>
            {canPickBranch && isNew && (
              <FormSelect label="Branch" required value={f.branchId} onChange={pick('branchId')} options={(branchesQ.data || []).map((b) => ({ value: b._id, label: b.name }))} placeholder="Select branch…" />
            )}
            <Field label="From date" htmlFor="ex-from"><Input id="ex-from" type="date" value={f.fromDate} onChange={set('fromDate')} /></Field>
            <Field label="To date" htmlFor="ex-to"><Input id="ex-to" type="date" value={f.toDate} onChange={set('toDate')} /></Field>
          </div>
          {isRecurring && (
            <div className="bg-muted/40 grid grid-cols-2 gap-4 rounded-md border p-3">
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.autoAdd} onChange={(e) => setF((s) => ({ ...s, autoAdd: e.target.checked }))} /> Auto-add each cycle
              </label>
              <Field label="Every (months)" htmlFor="ex-freq"><Input id="ex-freq" type="number" value={f.reoccurringFrequency} onChange={set('reoccurringFrequency')} /></Field>
              <FormSelect label="Derive amount from" value={f.deriveExpectedExpenseFrom} onChange={pick('deriveExpectedExpenseFrom')} options={EXPENSE_REF_TYPE} />
            </div>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : isNew ? 'Create' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

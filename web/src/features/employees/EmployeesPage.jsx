import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/AuthContext';
import { createEmployee, listEmployees, updateEmployee } from '@/api/employees';
import { listBatches } from '@/api/batches';
import { listBranches } from '@/api/branches';
import { CAN_EDIT_CORE, EMPLOYEE_STATUS, SALARY_TYPE } from '@/constants/enums';
import { fullName } from '@/lib/format';
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

export default function EmployeesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = CAN_EDIT_CORE.includes(user?.role);
  const [editing, setEditing] = useState(null);
  const { q, searchRaw, setSearchRaw, filters, setFilter, setPage } = usePagedList('employees', listEmployees);
  const data = q.data;

  const columns = [
    { key: 'name', header: 'Name', render: (e) => <span className="font-medium">{fullName(e.name)}</span> },
    { key: 'phone', header: 'Phone', render: (e) => e.phone || '—' },
    { key: 'branch', header: 'Branch', render: (e) => e.branchId?.name || '—' },
    { key: 'salaryType', header: 'Salary Type' },
    { key: 'status', header: 'Status', render: (e) => <StatusBadge value={e.activeStatus} /> },
  ];
  if (canEdit) {
    columns.push({
      key: 'actions',
      header: '',
      align: 'right',
      render: (e) => (
        <Button variant="ghost" size="sm" onClick={() => setEditing(e)}>
          Edit
        </Button>
      ),
    });
  }

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Input className="h-8 max-w-xs" placeholder="Search first name…" value={searchRaw} onChange={(e) => setSearchRaw(e.target.value)} />
      <ToolbarSelect value={filters.activeStatus} onChange={(v) => setFilter('activeStatus', v)} options={EMPLOYEE_STATUS} placeholder="All status" className="w-36" />
      <ToolbarSelect value={filters.salaryType} onChange={(v) => setFilter('salaryType', v)} options={SALARY_TYPE} placeholder="All salary types" className="w-44" />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Employees"
        description={`${data?.meta?.total ?? '…'} employees`}
        actions={canEdit && <Button onClick={() => setEditing({})}><Plus /> Add Employee</Button>}
      />
      <DataTable
        columns={columns}
        rows={data?.items || []}
        loading={q.isLoading}
        error={q.isError ? q.error : null}
        onRetry={q.refetch}
        empty={<EmptyState icon={Briefcase} title="No employees found" />}
        meta={data?.meta}
        onPage={setPage}
        toolbar={toolbar}
      />
      {editing && (
        <EmployeeDialog
          employee={editing}
          canPickBranch={user?.role === 'SUPER_ADMIN'}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['employees'] });
          }}
        />
      )}
    </div>
  );
}

function EmployeeDialog({ employee, canPickBranch, onClose, onSaved }) {
  const isNew = !employee._id;
  const branchesQ = useQuery({ queryKey: ['branches'], queryFn: listBranches, enabled: canPickBranch });
  const batchesQ = useQuery({ queryKey: ['batches', 'lookup'], queryFn: () => listBatches({ limit: 100 }) });
  const n = employee.name || {};
  const [form, setForm] = useState({
    prefix: n.prefix || '',
    first: n.first || '',
    last: n.last || '',
    phone: employee.phone || '',
    branchId: employee.branchId?._id || employee.branchId || '',
    activeStatus: employee.activeStatus || 'Active',
    salaryType: employee.salaryType || '',
    fixedSalary: employee.fixedSalary ?? '',
    classWiseSalary: employee.classWiseSalary ?? '',
    percentage: employee.percentage ?? '',
    freeLeaves: employee.freeLeaves ?? '',
    deductionPerLeave: employee.deductionPerLeave ?? '',
    deductionPerUninformedLeave: employee.deductionPerUninformedLeave ?? '',
    extraIncentive: employee.extraIncentive ?? '',
    batchIds: (employee.batchIds || []).map((b) => (typeof b === 'string' ? b : b._id)),
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const pick = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const num = (v) => (v === '' ? undefined : Number(v));
  const toggleBatch = (id) =>
    setForm((f) => ({ ...f, batchIds: f.batchIds.includes(id) ? f.batchIds.filter((x) => x !== id) : [...f.batchIds, id] }));

  const mut = useMutation({
    mutationFn: (body) => (isNew ? createEmployee(body) : updateEmployee(employee._id, body)),
    onSuccess: () => {
      toast.success(isNew ? 'Employee created' : 'Employee updated');
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
    if (!form.first.trim()) return setError('First name is required');
    if (!form.salaryType) return setError('Salary type is required');
    if (canPickBranch && !form.branchId) return setError('Select a branch');
    mut.mutate({
      name: { prefix: form.prefix || undefined, first: form.first.trim(), last: form.last || undefined },
      phone: form.phone || undefined,
      branchId: canPickBranch ? form.branchId : undefined,
      activeStatus: form.activeStatus,
      salaryType: form.salaryType,
      fixedSalary: num(form.fixedSalary),
      classWiseSalary: num(form.classWiseSalary),
      percentage: num(form.percentage),
      freeLeaves: num(form.freeLeaves),
      deductionPerLeave: num(form.deductionPerLeave),
      deductionPerUninformedLeave: num(form.deductionPerUninformedLeave),
      extraIncentive: num(form.extraIncentive),
      batchIds: form.batchIds,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add Employee' : 'Edit Employee'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Prefix" htmlFor="e-prefix"><Input id="e-prefix" value={form.prefix} onChange={set('prefix')} placeholder="Mr./Ms." /></Field>
            <Field label="First name" required htmlFor="e-first"><Input id="e-first" value={form.first} onChange={set('first')} /></Field>
            <Field label="Last name" htmlFor="e-last"><Input id="e-last" value={form.last} onChange={set('last')} /></Field>
            <Field label="Phone" htmlFor="e-phone"><Input id="e-phone" value={form.phone} onChange={set('phone')} /></Field>
            {canPickBranch && (
              <FormSelect label="Branch" required value={form.branchId} onChange={pick('branchId')} options={(branchesQ.data || []).map((b) => ({ value: b._id, label: b.name }))} placeholder="Select branch…" />
            )}
            <FormSelect label="Status" value={form.activeStatus} onChange={pick('activeStatus')} options={EMPLOYEE_STATUS} />
          </div>

          <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Payroll</div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <FormSelect label="Salary type" required value={form.salaryType} onChange={pick('salaryType')} options={SALARY_TYPE} />
            <Field label="Fixed salary" htmlFor="e-fs"><Input id="e-fs" type="number" value={form.fixedSalary} onChange={set('fixedSalary')} /></Field>
            <Field label="Class-wise salary" htmlFor="e-cws"><Input id="e-cws" type="number" value={form.classWiseSalary} onChange={set('classWiseSalary')} /></Field>
            <Field label="Percentage (%)" htmlFor="e-pct"><Input id="e-pct" type="number" value={form.percentage} onChange={set('percentage')} /></Field>
            <Field label="Free leaves" htmlFor="e-fl"><Input id="e-fl" type="number" value={form.freeLeaves} onChange={set('freeLeaves')} /></Field>
            <Field label="Deduction / leave" htmlFor="e-dl"><Input id="e-dl" type="number" value={form.deductionPerLeave} onChange={set('deductionPerLeave')} /></Field>
            <Field label="Deduction / uninformed" htmlFor="e-dul"><Input id="e-dul" type="number" value={form.deductionPerUninformedLeave} onChange={set('deductionPerUninformedLeave')} /></Field>
            <Field label="Extra incentive" htmlFor="e-ei"><Input id="e-ei" type="number" value={form.extraIncentive} onChange={set('extraIncentive')} /></Field>
          </div>

          <Field label="Assigned batches">
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-md border p-2.5">
              {(batchesQ.data?.items || []).map((b) => {
                const on = form.batchIds.includes(b._id);
                return (
                  <button
                    type="button"
                    key={b._id}
                    onClick={() => toggleBatch(b._id)}
                    className={cn('rounded-md border px-2.5 py-1 text-xs font-medium transition-colors', on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent')}
                  >
                    {b.batchName}
                  </button>
                );
              })}
              {(batchesQ.data?.items || []).length === 0 && <span className="text-muted-foreground text-sm">No batches yet</span>}
            </div>
          </Field>

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

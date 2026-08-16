import { useQuery } from '@tanstack/react-query';
import { ArrowRight, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { getAuditFields, listAudit } from '@/api/audit';
import { listBranches } from '@/api/branches';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { ToolbarSelect } from '@/components/forms/fields';
import { Input } from '@/components/ui/input';
import { fullName } from '@/lib/format';
import { usePagedList } from '../shared/usePagedList';

/** camelCase field name → readable label. */
const label = (f) =>
  (f || '').replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();

function when(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  if (mins < 10080) return `${Math.round(mins / 1440)}d ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AuditPage() {
  const { user } = useAuth();
  const crossBranch = user?.role === 'SUPER_ADMIN';
  const { q, searchRaw, setSearchRaw, filters, setFilter, setPage } = usePagedList('audit', listAudit);
  const fieldsQ = useQuery({ queryKey: ['audit', 'fields'], queryFn: () => getAuditFields() });
  const branchesQ = useQuery({ queryKey: ['branches'], queryFn: () => listBranches(), enabled: crossBranch });
  const data = q.data;

  const columns = [
    {
      key: 'record',
      header: 'Record',
      render: (r) =>
        r.studentId ? (
          <Link to={`/students/${r.studentId._id}`} className="hover:text-primary font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
            {fullName(r.studentId.name)}
            {r.studentId.formNo ? <span className="text-muted-foreground font-normal"> #{r.studentId.formNo}</span> : null}
          </Link>
        ) : (
          <span className="text-muted-foreground">System</span>
        ),
    },
    { key: 'fieldChanged', header: 'Field', render: (r) => <span className="font-medium">{label(r.fieldChanged)}</span> },
    {
      key: 'change',
      header: 'Change',
      render: (r) => (
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 line-through decoration-1">{r.oldValue || '—'}</span>
          <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
          <span className="bg-success/10 text-success rounded px-1.5 py-0.5 font-medium">{r.newValue || '—'}</span>
        </div>
      ),
    },
    { key: 'branch', header: 'Branch', render: (r) => r.branchId?.name || '—' },
    { key: 'by', header: 'Changed by', render: (r) => r.changedBy?.name || <span className="text-muted-foreground">System job</span> },
    { key: 'when', header: 'When', align: 'right', render: (r) => <span title={new Date(r.changeDate).toLocaleString('en-IN')}>{when(r.changeDate)}</span> },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Input className="h-8 max-w-xs" placeholder="Search field or value…" value={searchRaw} onChange={(e) => setSearchRaw(e.target.value)} />
      <ToolbarSelect
        value={filters.field}
        onChange={(v) => setFilter('field', v)}
        options={(fieldsQ.data || []).map((f) => ({ value: f, label: label(f) }))}
        placeholder="All fields"
        className="w-44"
      />
      {crossBranch && (
        <ToolbarSelect
          value={filters.branchId}
          onChange={(v) => setFilter('branchId', v)}
          options={(branchesQ.data || []).map((b) => ({ value: b._id, label: b.name }))}
          placeholder="All branches"
          className="w-44"
        />
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Audit History"
        description="Every tracked field change, newest first — written automatically by the system engines"
      />
      <DataTable
        columns={columns}
        rows={data?.items || []}
        loading={q.isLoading}
        error={q.isError ? q.error : null}
        onRetry={q.refetch}
        empty={
          <EmptyState
            icon={History}
            title="No changes recorded yet"
            description="Status changes, fee updates and other tracked edits will appear here as they happen."
          />
        }
        meta={data?.meta}
        onPage={setPage}
        toolbar={toolbar}
      />
    </div>
  );
}

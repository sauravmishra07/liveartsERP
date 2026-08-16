import { Presentation } from 'lucide-react';
import { listDemos } from '@/api/crm';
import { formatDate, fullName } from '@/lib/format';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePagedList } from '../shared/usePagedList';

export default function DemosPage() {
  const { q, setPage } = usePagedList('demos', listDemos);
  const data = q.data;
  const columns = [
    { key: 'name', header: 'Enquiry', render: (d) => <span className="font-medium">{fullName(d.enquiryId?.name)}</span> },
    { key: 'phone', header: 'Phone', render: (d) => d.enquiryId?.phone || '—' },
    { key: 'date', header: 'Date', render: (d) => formatDate(d.date) },
    { key: 'time', header: 'Time', render: (d) => d.time || '—' },
    { key: 'status', header: 'Status', render: (d) => <StatusBadge value={d.status} /> },
  ];
  return (
    <div>
      <PageHeader title="Demos" description="Scheduled trial classes" />
      <DataTable
        columns={columns}
        rows={data?.items || []}
        loading={q.isLoading}
        error={q.isError ? q.error : null}
        onRetry={q.refetch}
        empty={<EmptyState icon={Presentation} title="No demos scheduled" />}
        meta={data?.meta}
        onPage={setPage}
      />
    </div>
  );
}

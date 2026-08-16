import { PhoneCall } from 'lucide-react';
import { listFollowUps } from '@/api/crm';
import { formatDate, fullName } from '@/lib/format';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePagedList } from '../shared/usePagedList';

export default function FollowUpsPage() {
  const { q, setPage } = usePagedList('follow-ups', listFollowUps);
  const data = q.data;
  const columns = [
    { key: 'name', header: 'Enquiry', render: (f) => <span className="font-medium">{fullName(f.enquiryId?.name)}</span> },
    { key: 'phone', header: 'Phone', render: (f) => f.enquiryId?.phone || '—' },
    { key: 'type', header: 'Type', render: (f) => f.type || '—' },
    { key: 'date', header: 'Date', render: (f) => formatDate(f.date) },
    { key: 'next', header: 'Next', render: (f) => formatDate(f.nextFollowUpDate) },
    { key: 'remarks', header: 'Remarks', render: (f) => f.remarks || '—' },
  ];
  return (
    <div>
      <PageHeader title="Follow-ups" description="Enquiry follow-up history" />
      <DataTable
        columns={columns}
        rows={data?.items || []}
        loading={q.isLoading}
        error={q.isError ? q.error : null}
        onRetry={q.refetch}
        empty={<EmptyState icon={PhoneCall} title="No follow-ups yet" />}
        meta={data?.meta}
        onPage={setPage}
      />
    </div>
  );
}

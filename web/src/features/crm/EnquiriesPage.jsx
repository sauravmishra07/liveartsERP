import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/AuthContext';
import { listBatches } from '@/api/batches';
import { addDemo, addFollowUp, convertEnquiry, createEnquiry, getEnquiry, listEnquiries } from '@/api/crm';
import { ACTIVITY, DEMO_STATUS, ENQUIRY_STATUS, FEE_TYPE, FOLLOWUP_TYPE } from '@/constants/enums';
import { formatDate, fullName } from '@/lib/format';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Field, FormSelect, FormTextarea, ToolbarSelect } from '@/components/forms/fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { usePagedList } from '../shared/usePagedList';

const EDIT_ROLES = ['SUPER_ADMIN', 'BRANCH_ADMIN', 'STAFF'];

export default function EnquiriesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = EDIT_ROLES.includes(user?.role);
  const [adding, setAdding] = useState(false);
  const [viewId, setViewId] = useState(null);
  const { q, searchRaw, setSearchRaw, filters, setFilter, setPage } = usePagedList('enquiries', listEnquiries);
  const data = q.data;

  const columns = [
    { key: 'name', header: 'Name', render: (e) => <span className="font-medium">{fullName(e.name)}</span> },
    { key: 'phone', header: 'Phone', render: (e) => e.phone || '—' },
    { key: 'activity', header: 'Interested in', render: (e) => e.interestedActivity || '—' },
    { key: 'status', header: 'Status', render: (e) => <StatusBadge value={e.status} /> },
    { key: 'next', header: 'Next follow-up', render: (e) => formatDate(e.nextFollowUpDate) },
  ];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Input className="h-8 max-w-xs" placeholder="Search name or phone…" value={searchRaw} onChange={(e) => setSearchRaw(e.target.value)} />
      <ToolbarSelect value={filters.status} onChange={(v) => setFilter('status', v)} options={ENQUIRY_STATUS} placeholder="All status" className="w-44" />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Enquiries"
        description="Leads pipeline and follow-ups"
        actions={canEdit && <Button onClick={() => setAdding(true)}><Plus /> Add Enquiry</Button>}
      />
      <DataTable
        columns={columns}
        rows={data?.items || []}
        loading={q.isLoading}
        error={q.isError ? q.error : null}
        onRetry={q.refetch}
        empty={<EmptyState icon={UserPlus} title="No enquiries yet" />}
        meta={data?.meta}
        onPage={setPage}
        toolbar={toolbar}
        onRowClick={(e) => setViewId(e._id)}
      />
      {adding && (
        <EnquiryForm canPickBranch={user?.role === 'SUPER_ADMIN'} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); qc.invalidateQueries({ queryKey: ['enquiries'] }); }} />
      )}
      {viewId && <EnquiryDetail id={viewId} canEdit={canEdit} onClose={() => setViewId(null)} />}
    </div>
  );
}

function EnquiryForm({ canPickBranch, onClose, onSaved }) {
  const [f, setF] = useState({ prefix: '', first: '', last: '', phone: '', source: '', interestedActivity: '', branchId: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const pick = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const mut = useMutation({
    mutationFn: (b) => createEnquiry(b),
    onSuccess: () => { toast.success('Enquiry added'); onSaved(); },
    onError: (e) => { setError(e.message); toast.error(e.message); },
  });
  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!f.first.trim()) return setError('First name is required');
    if (canPickBranch && !f.branchId) return setError('Select a branch');
    mut.mutate({
      name: { prefix: f.prefix || undefined, first: f.first.trim(), last: f.last || undefined },
      phone: f.phone || undefined,
      source: f.source || undefined,
      interestedActivity: f.interestedActivity || undefined,
      branchId: canPickBranch ? f.branchId : undefined,
    });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Enquiry</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" required htmlFor="en-first"><Input id="en-first" value={f.first} onChange={set('first')} /></Field>
            <Field label="Last name" htmlFor="en-last"><Input id="en-last" value={f.last} onChange={set('last')} /></Field>
            <Field label="Phone" htmlFor="en-phone"><Input id="en-phone" value={f.phone} onChange={set('phone')} /></Field>
            <Field label="Source" htmlFor="en-source"><Input id="en-source" value={f.source} onChange={set('source')} placeholder="Instagram, walk-in…" /></Field>
            <FormSelect label="Interested in" value={f.interestedActivity} onChange={pick('interestedActivity')} options={ACTIVITY} allowClear />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EnquiryDetail({ id, canEdit, onClose }) {
  const qc = useQueryClient();
  const [panel, setPanel] = useState(null); // followup | demo | convert
  const q = useQuery({ queryKey: ['enquiry', id], queryFn: () => getEnquiry(id) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['enquiry', id] });
    qc.invalidateQueries({ queryKey: ['enquiries'] });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        {q.isLoading ? (
          <LoadingState />
        ) : q.isError ? (
          <p className="text-destructive text-sm">{q.error.message}</p>
        ) : (
          <Detail data={q.data} canEdit={canEdit} panel={panel} setPanel={setPanel} refresh={refresh} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Detail({ data, canEdit, panel, setPanel, refresh, onClose }) {
  const { enquiry, demos, followUps, activities } = data;
  const converted = enquiry.status === 'Converted';
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {fullName(enquiry.name)} <StatusBadge value={enquiry.status} />
        </DialogTitle>
      </DialogHeader>
      <div className="text-muted-foreground text-sm">
        {enquiry.phone || '—'} · {enquiry.interestedActivity || 'Interest not set'} {enquiry.source ? `· ${enquiry.source}` : ''}
      </div>

      {canEdit && !converted && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={panel === 'followup' ? 'default' : 'outline'} onClick={() => setPanel(panel === 'followup' ? null : 'followup')}>Log follow-up</Button>
          <Button size="sm" variant={panel === 'demo' ? 'default' : 'outline'} onClick={() => setPanel(panel === 'demo' ? null : 'demo')}>Schedule demo</Button>
          <Button size="sm" onClick={() => setPanel(panel === 'convert' ? null : 'convert')}>Convert to student</Button>
        </div>
      )}

      {panel === 'followup' && <FollowUpForm enquiryId={enquiry._id} onDone={() => { setPanel(null); refresh(); }} />}
      {panel === 'demo' && <DemoForm enquiryId={enquiry._id} onDone={() => { setPanel(null); refresh(); }} />}
      {panel === 'convert' && <ConvertForm enquiryId={enquiry._id} onDone={() => { setPanel(null); refresh(); }} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Timeline</div>
          <div className="space-y-2">
            {activities.map((a) => (
              <div key={a._id} className="border-l-2 border-primary/30 pl-3">
                <div className="text-sm font-medium">{a.action}</div>
                {a.notes && <div className="text-muted-foreground text-xs">{a.notes}</div>}
                <div className="text-muted-foreground text-[11px]">{formatDate(a.date)}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Demos ({demos.length}) · Follow-ups ({followUps.length})</div>
          <div className="space-y-1.5 text-sm">
            {demos.map((d) => (
              <div key={d._id} className="flex justify-between"><span>Demo {formatDate(d.date)} {d.time || ''}</span><StatusBadge value={d.status} /></div>
            ))}
            {followUps.map((f) => (
              <div key={f._id} className="flex justify-between"><span>{f.type || 'Follow-up'}</span><span className="text-muted-foreground text-xs">{formatDate(f.date)}</span></div>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </DialogFooter>
    </>
  );
}

function FollowUpForm({ enquiryId, onDone }) {
  const [f, setF] = useState({ type: 'Manual Follow-up', remarks: '', nextFollowUpDate: '' });
  const mut = useMutation({
    mutationFn: () => addFollowUp(enquiryId, { type: f.type, remarks: f.remarks || undefined, nextFollowUpDate: f.nextFollowUpDate || undefined }),
    onSuccess: () => { toast.success('Follow-up logged'); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="bg-muted/40 grid grid-cols-2 gap-3 rounded-md border p-3">
      <FormSelect label="Type" value={f.type} onChange={(v) => setF((s) => ({ ...s, type: v }))} options={FOLLOWUP_TYPE} />
      <Field label="Next follow-up" htmlFor="fu-next"><Input id="fu-next" type="date" value={f.nextFollowUpDate} onChange={(e) => setF((s) => ({ ...s, nextFollowUpDate: e.target.value }))} /></Field>
      <div className="col-span-2"><FormTextarea label="Remarks" value={f.remarks} onChange={(e) => setF((s) => ({ ...s, remarks: e.target.value }))} /></div>
      <div className="col-span-2 flex justify-end"><Button size="sm" disabled={mut.isPending} onClick={() => mut.mutate()}>Save follow-up</Button></div>
    </div>
  );
}

function DemoForm({ enquiryId, onDone }) {
  const batchesQ = useQuery({ queryKey: ['batches', 'lookup'], queryFn: () => listBatches({ limit: 100 }) });
  const [f, setF] = useState({ date: new Date().toLocaleDateString('en-CA'), time: '', status: 'Scheduled', batchId: '', remarks: '' });
  const mut = useMutation({
    mutationFn: () => addDemo(enquiryId, { date: f.date, time: f.time || undefined, status: f.status, batchId: f.batchId || undefined, remarks: f.remarks || undefined }),
    onSuccess: () => { toast.success('Demo scheduled'); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="bg-muted/40 grid grid-cols-2 gap-3 rounded-md border p-3">
      <Field label="Date" htmlFor="dm-date"><Input id="dm-date" type="date" value={f.date} onChange={(e) => setF((s) => ({ ...s, date: e.target.value }))} /></Field>
      <Field label="Time" htmlFor="dm-time"><Input id="dm-time" value={f.time} onChange={(e) => setF((s) => ({ ...s, time: e.target.value }))} placeholder="5:00 PM" /></Field>
      <FormSelect label="Status" value={f.status} onChange={(v) => setF((s) => ({ ...s, status: v }))} options={DEMO_STATUS} />
      <FormSelect label="Batch" value={f.batchId} onChange={(v) => setF((s) => ({ ...s, batchId: v }))} options={(batchesQ.data?.items || []).map((b) => ({ value: b._id, label: b.batchName }))} placeholder="Optional" allowClear />
      <div className="col-span-2 flex justify-end"><Button size="sm" disabled={mut.isPending} onClick={() => mut.mutate()}>Save demo</Button></div>
    </div>
  );
}

function ConvertForm({ enquiryId, onDone }) {
  const batchesQ = useQuery({ queryKey: ['batches', 'lookup'], queryFn: () => listBatches({ limit: 100 }) });
  const [f, setF] = useState({ joiningDate: new Date().toLocaleDateString('en-CA'), batchId: '', preferredFeePackage: 'Monthly', monthlyFee: '' });
  const mut = useMutation({
    mutationFn: () => convertEnquiry(enquiryId, {
      joiningDate: f.joiningDate,
      batchId: f.batchId || undefined,
      preferredFeePackage: f.preferredFeePackage || undefined,
      monthlyFee: f.monthlyFee === '' ? undefined : Number(f.monthlyFee),
    }),
    onSuccess: () => { toast.success('Converted to student'); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="bg-success/5 border-success/30 grid grid-cols-2 gap-3 rounded-md border p-3">
      <div className="col-span-2 text-sm font-medium">Convert to student</div>
      <Field label="Joining date" htmlFor="cv-join"><Input id="cv-join" type="date" value={f.joiningDate} onChange={(e) => setF((s) => ({ ...s, joiningDate: e.target.value }))} /></Field>
      <FormSelect label="Batch" value={f.batchId} onChange={(v) => setF((s) => ({ ...s, batchId: v }))} options={(batchesQ.data?.items || []).map((b) => ({ value: b._id, label: b.batchName }))} placeholder="Select batch…" allowClear />
      <FormSelect label="Fee package" value={f.preferredFeePackage} onChange={(v) => setF((s) => ({ ...s, preferredFeePackage: v }))} options={FEE_TYPE} />
      <Field label="Monthly fee" htmlFor="cv-fee"><Input id="cv-fee" type="number" value={f.monthlyFee} onChange={(e) => setF((s) => ({ ...s, monthlyFee: e.target.value }))} /></Field>
      <div className="col-span-2 flex justify-end"><Button size="sm" disabled={mut.isPending} onClick={() => mut.mutate()}>Confirm conversion</Button></div>
    </div>
  );
}

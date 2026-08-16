import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { collectFee, quoteFee } from '@/api/fees';
import { listStudents } from '@/api/students';
import { FEE_TYPE } from '@/constants/enums';
import { currency, formatDate, fullName } from '@/lib/format';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Field, FormSelect } from '@/components/forms/fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const num = (v) => (v === '' || v == null ? undefined : Number(v));
const todayStr = () => new Date().toLocaleDateString('en-CA');

export default function CollectFeeDialog({ student: fixedStudent, onClose, onCollected }) {
  const [studentId, setStudentId] = useState(fixedStudent?._id || '');
  const [f, setF] = useState({
    feeType: 'Monthly',
    noOfDaysMonths: '30',
    noOfClasses: '',
    cash: true,
    online: false,
    cashAmount: '',
    onlineAmount: '',
    previousBalanceIfAny: '',
    waivedOffAmount: '',
    extendedDays: '',
    amount: '',
  });
  const [receipt, setReceipt] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const studentsQ = useQuery({
    queryKey: ['students', 'lookup-active'],
    queryFn: () => listStudents({ limit: 100, activeStatus: 'Active' }),
    enabled: !fixedStudent,
  });

  const payload = useMemo(
    () => ({
      studentId,
      feeType: f.feeType,
      noOfDaysMonths: num(f.noOfDaysMonths),
      noOfClasses: num(f.noOfClasses),
      modeOfPayment: [f.cash && 'Cash', f.online && 'Online'].filter(Boolean),
      cashAmount: num(f.cashAmount),
      onlineAmount: num(f.onlineAmount),
      previousBalanceIfAny: num(f.previousBalanceIfAny),
      waivedOffAmount: num(f.waivedOffAmount),
      extendedDays: num(f.extendedDays),
      amount: f.feeType === 'Other' ? num(f.amount) : undefined,
      paymentDate: todayStr(),
    }),
    [studentId, f],
  );

  // Debounced live quote (server is the authority for all calculations).
  const [debounced, setDebounced] = useState(payload);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(payload), 300);
    return () => clearTimeout(t);
  }, [payload]);
  const quoteQ = useQuery({
    queryKey: ['fee-quote', debounced],
    queryFn: () => quoteFee(debounced),
    enabled: !!(debounced.studentId && debounced.feeType),
  });
  const quote = quoteQ.data;

  const mut = useMutation({
    mutationFn: () => collectFee(payload),
    onSuccess: (data) => {
      toast.success('Payment collected');
      setReceipt(data);
      onCollected?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const studentName = fixedStudent
    ? fullName(fixedStudent.name)
    : fullName(studentsQ.data?.items?.find((s) => s._id === studentId)?.name);

  if (receipt) {
    return <Receipt data={receipt} studentName={studentName} payload={payload} onClose={onClose} />;
  }

  const isOther = f.feeType === 'Other';
  const isAttendance = f.feeType === 'Attendence Based';

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Collect Fee</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {fixedStudent ? (
            <Field label="Student"><Input value={studentName} disabled /></Field>
          ) : (
            <FormSelect
              label="Student"
              required
              value={studentId}
              onChange={setStudentId}
              options={(studentsQ.data?.items || []).map((s) => ({ value: s._id, label: fullName(s.name) }))}
              placeholder="Select student…"
            />
          )}
          <FormSelect label="Fee type" required value={f.feeType} onChange={(v) => setF((s) => ({ ...s, feeType: v }))} options={FEE_TYPE} />

          {!isOther && !isAttendance && (
            <Field label={f.feeType === 'Package' ? 'Months' : 'No. of days'} htmlFor="cf-days">
              <Input id="cf-days" type="number" value={f.noOfDaysMonths} onChange={set('noOfDaysMonths')} />
            </Field>
          )}
          {isAttendance && (
            <>
              <Field label="Validity (days)" htmlFor="cf-days"><Input id="cf-days" type="number" value={f.noOfDaysMonths} onChange={set('noOfDaysMonths')} /></Field>
              <Field label="No. of classes" htmlFor="cf-classes"><Input id="cf-classes" type="number" value={f.noOfClasses} onChange={set('noOfClasses')} /></Field>
            </>
          )}
          {isOther && (
            <Field label="Amount" htmlFor="cf-amount"><Input id="cf-amount" type="number" value={f.amount} onChange={set('amount')} /></Field>
          )}

          {!isOther && (
            <>
              <Field label="Previous balance (if any)" htmlFor="cf-prev"><Input id="cf-prev" type="number" value={f.previousBalanceIfAny} onChange={set('previousBalanceIfAny')} /></Field>
              <Field label="Waived off" htmlFor="cf-waived"><Input id="cf-waived" type="number" value={f.waivedOffAmount} onChange={set('waivedOffAmount')} /></Field>
            </>
          )}
        </div>

        <div className="mt-1">
          <div className="text-sm font-medium">Payment mode</div>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.cash} onChange={(e) => setF((s) => ({ ...s, cash: e.target.checked }))} /> Cash
              </label>
              <Input type="number" placeholder="Cash amount" disabled={!f.cash} value={f.cashAmount} onChange={set('cashAmount')} />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={f.online} onChange={(e) => setF((s) => ({ ...s, online: e.target.checked }))} /> Online
              </label>
              <Input type="number" placeholder="Online amount" disabled={!f.online} value={f.onlineAmount} onChange={set('onlineAmount')} />
            </div>
          </div>
        </div>

        {/* Live dues summary — computed server-side */}
        <div className="bg-muted/50 mt-2 grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border p-4 text-sm sm:grid-cols-3">
          <Summary label="Current balance" value={currency(quote?.currentBalance)} />
          <Summary label="Fee for period" value={currency(quote?.amount)} />
          <Summary label="Paying now" value={currency(quote?.amountPaid)} />
          <Summary label="Remaining balance" value={currency(quote?.balance)} strong />
          <Summary label="New due date" value={quote?.ne ? formatDate(quote.ne) : '—'} />
          <Summary label="Status" value={quote?.paymentStatus ? <StatusBadge value={quote.paymentStatus === 'Paid or Cleared' ? 'Paid' : 'Balance'} /> : '—'} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!studentId || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Collecting…' : 'Collect Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Summary({ label, value, strong }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs uppercase">{label}</div>
      <div className={strong ? 'text-base font-semibold' : 'font-medium'}>{value}</div>
    </div>
  );
}

function Receipt({ data, studentName, payload, onClose }) {
  const rec = data.feeRecord;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border p-5">
          <div className="text-primary text-center text-lg font-extrabold">Live Arts</div>
          <div className="text-muted-foreground mb-3 text-center text-xs">Fee Receipt</div>
          <Line k="Receipt" v={rec._id?.slice(-8).toUpperCase()} />
          <Line k="Student" v={studentName} />
          <Line k="Date" v={formatDate(rec.paymentDate)} />
          <Line k="Fee type" v={rec.feeType} />
          <Line k="Mode" v={(rec.modeOfPayment || []).join(', ') || '—'} />
          <Line k="Amount" v={currency(rec.amount)} />
          <Line k="Paid" v={currency(rec.amountPaid)} strong />
          <Line k="Remaining balance" v={currency(data.student.balance)} />
          <Line k="Next due date" v={data.student.latestDueDate ? formatDate(data.student.latestDueDate) : '—'} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Line({ k, v, strong }) {
  return (
    <div className="flex justify-between border-b py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className={strong ? 'font-semibold' : ''}>{v}</span>
    </div>
  );
}

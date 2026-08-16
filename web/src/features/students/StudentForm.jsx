import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createStudent, updateStudent } from '@/api/students';
import { listBatches } from '@/api/batches';
import { listBranches } from '@/api/branches';
import { ACTIVE_STATUS, FEE_TYPE, GENDER, STUDENT_STATUS } from '@/constants/enums';
import { toDateInput } from '@/lib/format';
import { Field, FormSelect, FormTextarea } from '@/components/forms/fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const Section = ({ title }) => (
  <div className="text-muted-foreground border-b pb-1 text-xs font-semibold tracking-wide uppercase">{title}</div>
);

export default function StudentForm({ student = {}, canPickBranch, onClose, onSaved }) {
  const isNew = !student._id;
  const branchesQ = useQuery({ queryKey: ['branches'], queryFn: listBranches, enabled: canPickBranch });
  const batchesQ = useQuery({ queryKey: ['batches', 'lookup'], queryFn: () => listBatches({ limit: 100 }) });
  const n = student.name || {};
  const [f, setF] = useState({
    formNo: student.formNo ?? '',
    activeStatus: student.activeStatus || 'Active',
    studentStatus: student.studentStatus || 'Demo',
    branchId: student.branchId?._id || student.branchId || '',
    batchId: student.batchId?._id || student.batchId || '',
    joiningDate: toDateInput(student.joiningDate),
    prefix: n.prefix || '',
    first: n.first || '',
    last: n.last || '',
    gender: student.gender || '',
    dateOfBirth: toDateInput(student.dateOfBirth),
    phoneNumber: student.phoneNumber || '',
    occupation: student.occupation || '',
    address: student.address || '',
    instagram: student.instagram || '',
    guardianName: student.guardianName || '',
    guardianRelation: student.guardianRelation || '',
    guardianOccupation: student.guardianOccupation || '',
    primaryContactPerson: student.primaryContactPerson || '',
    preferredFeePackage: student.preferredFeePackage || '',
    monthlyFee: student.monthlyFee ?? '',
    packageFee: student.packageFee ?? '',
    noOfMonthsInPackage: student.noOfMonthsInPackage ?? '',
    attendanceBasedFee: student.attendanceBasedFee ?? '',
    validityIfAttendanceBased: student.validityIfAttendanceBased ?? '',
    noOfClassesIfAttendanceBased: student.noOfClassesIfAttendanceBased ?? '',
    balance: student.balance ?? '',
    studentStatusRemarks: student.studentStatusRemarks || '',
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const pick = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const num = (v) => (v === '' ? undefined : Number(v));
  const str = (v) => (v === '' ? undefined : v);

  const mut = useMutation({
    mutationFn: (body) => (isNew ? createStudent(body) : updateStudent(student._id, body)),
    onSuccess: () => {
      toast.success(isNew ? 'Student created' : 'Student updated');
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
    if (!f.first.trim()) return setError('First name is required');
    if (!f.joiningDate) return setError('Joining date is required');
    if (canPickBranch && isNew && !f.branchId) return setError('Select a branch');
    const body = {
      formNo: num(f.formNo),
      activeStatus: f.activeStatus,
      studentStatus: f.studentStatus,
      joiningDate: f.joiningDate,
      batchId: str(f.batchId),
      name: { prefix: str(f.prefix), first: f.first.trim(), last: str(f.last) },
      gender: str(f.gender),
      dateOfBirth: str(f.dateOfBirth),
      phoneNumber: str(f.phoneNumber),
      occupation: str(f.occupation),
      address: str(f.address),
      instagram: str(f.instagram),
      guardianName: str(f.guardianName),
      guardianRelation: str(f.guardianRelation),
      guardianOccupation: str(f.guardianOccupation),
      primaryContactPerson: str(f.primaryContactPerson),
      preferredFeePackage: str(f.preferredFeePackage),
      monthlyFee: num(f.monthlyFee),
      packageFee: num(f.packageFee),
      noOfMonthsInPackage: num(f.noOfMonthsInPackage),
      attendanceBasedFee: num(f.attendanceBasedFee),
      validityIfAttendanceBased: num(f.validityIfAttendanceBased),
      noOfClassesIfAttendanceBased: num(f.noOfClassesIfAttendanceBased),
      balance: num(f.balance),
      studentStatusRemarks: str(f.studentStatusRemarks),
    };
    if (isNew && canPickBranch) body.branchId = f.branchId;
    mut.mutate(body);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add Student' : 'Edit Student'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Section title="Official" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Form No." htmlFor="s-form"><Input id="s-form" type="number" value={f.formNo} onChange={set('formNo')} /></Field>
            <FormSelect label="Active status" value={f.activeStatus} onChange={pick('activeStatus')} options={ACTIVE_STATUS} />
            <FormSelect label="Student status" value={f.studentStatus} onChange={pick('studentStatus')} options={STUDENT_STATUS} />
            {canPickBranch && isNew && (
              <FormSelect label="Branch" required value={f.branchId} onChange={pick('branchId')} options={(branchesQ.data || []).map((b) => ({ value: b._id, label: b.name }))} placeholder="Select branch…" />
            )}
            <FormSelect label="Batch" value={f.batchId} onChange={pick('batchId')} options={(batchesQ.data?.items || []).map((b) => ({ value: b._id, label: b.batchName }))} placeholder="Unassigned" allowClear />
            <Field label="Joining date" required htmlFor="s-join"><Input id="s-join" type="date" value={f.joiningDate} onChange={set('joiningDate')} /></Field>
          </div>

          <Section title="Personal" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Prefix" htmlFor="s-prefix"><Input id="s-prefix" value={f.prefix} onChange={set('prefix')} placeholder="Mr./Ms." /></Field>
            <Field label="First name" required htmlFor="s-first"><Input id="s-first" value={f.first} onChange={set('first')} /></Field>
            <Field label="Last name" htmlFor="s-last"><Input id="s-last" value={f.last} onChange={set('last')} /></Field>
            <FormSelect label="Gender" value={f.gender} onChange={pick('gender')} options={GENDER} allowClear />
            <Field label="Date of birth" htmlFor="s-dob"><Input id="s-dob" type="date" value={f.dateOfBirth} onChange={set('dateOfBirth')} /></Field>
            <Field label="Phone" htmlFor="s-phone"><Input id="s-phone" value={f.phoneNumber} onChange={set('phoneNumber')} /></Field>
            <Field label="Occupation" htmlFor="s-occ"><Input id="s-occ" value={f.occupation} onChange={set('occupation')} /></Field>
            <Field label="Instagram" htmlFor="s-ig"><Input id="s-ig" value={f.instagram} onChange={set('instagram')} /></Field>
          </div>
          <Field label="Address" htmlFor="s-addr"><Input id="s-addr" value={f.address} onChange={set('address')} /></Field>

          <Section title="Guardian" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Guardian name" htmlFor="s-gn"><Input id="s-gn" value={f.guardianName} onChange={set('guardianName')} /></Field>
            <Field label="Guardian relation" htmlFor="s-gr"><Input id="s-gr" value={f.guardianRelation} onChange={set('guardianRelation')} /></Field>
            <Field label="Guardian occupation" htmlFor="s-go"><Input id="s-go" value={f.guardianOccupation} onChange={set('guardianOccupation')} /></Field>
            <Field label="Primary contact" htmlFor="s-pcp"><Input id="s-pcp" value={f.primaryContactPerson} onChange={set('primaryContactPerson')} /></Field>
          </div>

          <Section title="Fee profile" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <FormSelect label="Preferred package" value={f.preferredFeePackage} onChange={pick('preferredFeePackage')} options={FEE_TYPE} allowClear />
            <Field label="Monthly fee" htmlFor="s-mf"><Input id="s-mf" type="number" value={f.monthlyFee} onChange={set('monthlyFee')} /></Field>
            <Field label="Package fee" htmlFor="s-pf"><Input id="s-pf" type="number" value={f.packageFee} onChange={set('packageFee')} /></Field>
            <Field label="Months in package" htmlFor="s-mip"><Input id="s-mip" type="number" value={f.noOfMonthsInPackage} onChange={set('noOfMonthsInPackage')} /></Field>
            <Field label="Attendance-based fee" htmlFor="s-abf"><Input id="s-abf" type="number" value={f.attendanceBasedFee} onChange={set('attendanceBasedFee')} /></Field>
            <Field label="Validity (days)" htmlFor="s-val"><Input id="s-val" type="number" value={f.validityIfAttendanceBased} onChange={set('validityIfAttendanceBased')} /></Field>
            <Field label="No. of classes" htmlFor="s-noc"><Input id="s-noc" type="number" value={f.noOfClassesIfAttendanceBased} onChange={set('noOfClassesIfAttendanceBased')} /></Field>
            <Field label="Balance" htmlFor="s-bal"><Input id="s-bal" type="number" value={f.balance} onChange={set('balance')} /></Field>
          </div>
          <FormTextarea label="Status remarks" htmlFor="s-rem" value={f.studentStatusRemarks} onChange={set('studentStatusRemarks')} />

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

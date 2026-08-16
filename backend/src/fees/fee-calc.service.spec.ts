import { FeeRecordPaymentStatus, FeeType } from '../common/enums';
import { daysBetweenIST, formatIST } from '../common/utils/date.util';
import { FeeCalcService } from './fee-calc.service';

/**
 * Locks the ported Zoho fee math (Requirements §6.1). Pure & DB-free — if any of
 * these change, a business rule moved and someone must intend it.
 */
describe('FeeCalcService.compute', () => {
  const svc = new FeeCalcService();
  const JAN1 = new Date('2026-01-01T00:00:00.000Z'); // → 01-Jan-2026 IST
  const q = (student: any, dto: any) => svc.compute(student, dto);

  describe('Monthly amount', () => {
    it('full month = full fee, cleared when paid in full', () => {
      const r = q({ monthlyFee: 3000, joiningDate: JAN1 }, { feeType: FeeType.MONTHLY, noOfDaysMonths: 30, cashAmount: 3000 });
      expect(r.amount).toBe(3000);
      expect(r.balance).toBe(0);
      expect(r.paymentStatus).toBe(FeeRecordPaymentStatus.PAID_OR_CLEARED);
    });

    it('prorates by days', () => {
      const r = q({ monthlyFee: 3000, joiningDate: JAN1 }, { feeType: FeeType.MONTHLY, noOfDaysMonths: 15 });
      expect(r.amount).toBe(1500); // ceil(3000/30 * 15)
    });

    it('adds previous balance, leaves a balance when underpaid', () => {
      const r = q({ monthlyFee: 3000, joiningDate: JAN1 }, { feeType: FeeType.MONTHLY, noOfDaysMonths: 30, previousBalanceIfAny: 500, cashAmount: 2000 });
      expect(r.amount).toBe(3500);
      expect(r.balance).toBe(1500);
      expect(r.paymentStatus).toBe(FeeRecordPaymentStatus.BALANCE);
    });

    it('subtracts waived-off amount', () => {
      const r = q({ monthlyFee: 3000, joiningDate: JAN1 }, { feeType: FeeType.MONTHLY, noOfDaysMonths: 30, waivedOffAmount: 300, cashAmount: 2700 });
      expect(r.amount).toBe(2700);
      expect(r.balance).toBe(0);
    });

    it('never goes negative (over-waiver clamps to 0)', () => {
      const r = q({ monthlyFee: 1000, joiningDate: JAN1 }, { feeType: FeeType.MONTHLY, noOfDaysMonths: 30, waivedOffAmount: 5000 });
      expect(r.amount).toBe(0);
    });

    it('splits cash + online into amountPaid', () => {
      const r = q({ monthlyFee: 3000, joiningDate: JAN1 }, { feeType: FeeType.MONTHLY, noOfDaysMonths: 30, cashAmount: 1000, onlineAmount: 2000 });
      expect(r.amountPaid).toBe(3000);
      expect(r.balance).toBe(0);
    });
  });

  describe('Package / Attendance / Other', () => {
    it('package = perUnit * units', () => {
      const r = q({ packageFee: 6000, noOfMonthsInPackage: 3, joiningDate: JAN1 }, { feeType: FeeType.PACKAGE, noOfDaysMonths: 3 });
      expect(r.amount).toBe(6000); // ceil(6000/3 * 3)
    });

    it('attendance-based = perClass * classes', () => {
      const full = q({ attendanceBasedFee: 4000, noOfClassesIfAttendanceBased: 20, joiningDate: JAN1 }, { feeType: FeeType.ATTENDANCE_BASED, noOfClasses: 20 });
      expect(full.amount).toBe(4000);
      const half = q({ attendanceBasedFee: 4000, noOfClassesIfAttendanceBased: 20, joiningDate: JAN1 }, { feeType: FeeType.ATTENDANCE_BASED, noOfClasses: 10 });
      expect(half.amount).toBe(2000);
    });

    it('other = manual amount, no payment status', () => {
      const r = q({ joiningDate: JAN1 }, { feeType: FeeType.OTHER, amount: 750 });
      expect(r.amount).toBe(750);
      expect(r.paymentStatus).toBeNull();
    });
  });

  describe('Ne (next due date)', () => {
    it('one month forward for 30 days', () => {
      const r = q({ monthlyFee: 3000, joiningDate: JAN1 }, { feeType: FeeType.MONTHLY, noOfDaysMonths: 30 });
      expect(formatIST(r.ne!)).toBe('01-Feb-2026');
      expect(daysBetweenIST(r.oldDueDate!, r.ne!)).toBe(31);
    });

    it('two months forward for 60 days', () => {
      const r = q({ monthlyFee: 3000, joiningDate: JAN1 }, { feeType: FeeType.MONTHLY, noOfDaysMonths: 60 });
      expect(formatIST(r.ne!)).toBe('01-Mar-2026');
    });

    it('Zoho quirk: 31 days rounds to exactly one month (no extra day)', () => {
      const r = q({ monthlyFee: 3000, joiningDate: JAN1 }, { feeType: FeeType.MONTHLY, noOfDaysMonths: 31 });
      expect(formatIST(r.ne!)).toBe('01-Feb-2026');
    });

    it('applies extended days', () => {
      const r = q({ monthlyFee: 3000, joiningDate: JAN1 }, { feeType: FeeType.MONTHLY, noOfDaysMonths: 30, extendedDays: 5 });
      expect(formatIST(r.ne!)).toBe('06-Feb-2026');
    });

    it('falls back to joiningDate when no prior due date', () => {
      const r = q({ monthlyFee: 3000, joiningDate: JAN1 }, { feeType: FeeType.MONTHLY, noOfDaysMonths: 30 });
      expect(formatIST(r.oldDueDate!)).toBe('01-Jan-2026');
    });

    it('no Ne for Other fee type', () => {
      const r = q({ joiningDate: JAN1 }, { feeType: FeeType.OTHER, amount: 500 });
      expect(r.ne).toBeNull();
    });
  });
});

import { Injectable } from '@nestjs/common';
import { FeeRecordPaymentStatus, FeeType } from '../common/enums';
import { addDays, addMonthsIST, startOfDayIST } from '../common/utils/date.util';
import { CollectFeeDto } from './dto/fee.dto';

const n = (v: any): number => Number(v || 0);

export interface FeeQuote {
  oldDueDate: Date | null;
  ne: Date | null;
  amount: number; // the fee due for this period (Zoho "Amount1")
  amountPaid: number;
  balance: number;
  paymentStatus: string | null;
}

/**
 * Point-of-collection fee calculation — a faithful port of the Zoho Fee_Records
 * on-add workflow. Pure & stateless: given the student's fee profile + the entry
 * inputs, it derives amount, next due date (Ne), balance, and payment status.
 * The SAME method powers the live quote and the actual collection (server is the authority).
 */
@Injectable()
export class FeeCalcService {
  compute(student: any, dto: CollectFeeDto): FeeQuote {
    const feeType = dto.feeType;
    const noOfDays = n(dto.noOfDaysMonths);
    const noOfClasses = n(dto.noOfClasses);
    const prevBal = n(dto.previousBalanceIfAny);
    const waivedOff = n(dto.waivedOffAmount);
    const extendedDays = n(dto.extendedDays);
    const amountPaid = n(dto.cashAmount) + n(dto.onlineAmount);

    const monthlyFee = n(student.monthlyFee);
    const packageFee = n(student.packageFee);
    const monthsInPkg = n(student.noOfMonthsInPackage) || 1;
    const attFee = n(student.attendanceBasedFee);
    const attClasses = n(student.noOfClassesIfAttendanceBased) || 1;

    const oldDueDate = dto.oldDueDate
      ? startOfDayIST(new Date(dto.oldDueDate))
      : student.latestDueDate
        ? startOfDayIST(new Date(student.latestDueDate))
        : student.joiningDate
          ? startOfDayIST(new Date(student.joiningDate))
          : null;

    // --- Ne (next due date), common to Monthly/Package/Attendance (Zoho) ---
    // months = round(days/30); remaining = days - 30*months.
    let ne: Date | null = null;
    if (feeType !== FeeType.OTHER && oldDueDate && noOfDays >= 0) {
      const months = Math.round(noOfDays / 30);
      const remaining = noOfDays - 30 * months;
      const base = addMonthsIST(oldDueDate, months);
      ne = remaining !== 1 ? addDays(base, remaining + extendedDays) : addDays(base, extendedDays);
    }

    // --- Amount (Zoho ceil formulas) ---
    let amount = 0;
    if (feeType === FeeType.MONTHLY) {
      if (noOfDays >= 0) amount = Math.ceil((monthlyFee / 30) * noOfDays + prevBal - waivedOff);
    } else if (feeType === FeeType.PACKAGE) {
      if (noOfDays >= 0) amount = Math.ceil((packageFee / monthsInPkg) * noOfDays + prevBal - waivedOff);
    } else if (feeType === FeeType.ATTENDANCE_BASED) {
      if (noOfClasses > 0) amount = Math.ceil((attFee / attClasses) * noOfClasses + prevBal - waivedOff);
    } else if (feeType === FeeType.OTHER) {
      amount = n(dto.amount); // manual entry
    }
    if (amount < 0) amount = 0;

    const balance = Math.max(0, amount - amountPaid);
    const paymentStatus =
      feeType === FeeType.OTHER
        ? null
        : balance === 0
          ? FeeRecordPaymentStatus.PAID_OR_CLEARED
          : FeeRecordPaymentStatus.BALANCE;

    return { oldDueDate, ne, amount, amountPaid, balance, paymentStatus };
  }
}

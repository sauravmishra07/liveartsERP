/**
 * Single source of truth for all enums (Requirements §7).
 * String values intentionally match the original Zoho app for data parity —
 * do NOT "clean up" these values (e.g. keep "Attendence Based", "Reoccurring").
 */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  BRANCH_ADMIN = 'BRANCH_ADMIN',
  STAFF = 'STAFF',
  TEACHER = 'TEACHER',
  EMPLOYEE = 'EMPLOYEE',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

/** Roles allowed to act across branches / see everything. */
export const CROSS_BRANCH_ROLES: UserRole[] = [UserRole.SUPER_ADMIN];

/** Roles that can administer a branch's data. */
export const ADMIN_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.BRANCH_ADMIN,
];

export enum ActiveStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export enum Activity {
  DANCE = 'Dance',
  FITNESS = 'Fitness',
  VOCAL_KEYBOARD = 'Vocal + Keyboard',
  GUITAR = 'Guitar',
  WEDDING_CHOREOGRAPHY = 'Wedding Choreography',
  GYMNASTICS = 'Gymnastics',
}

export enum FeeType {
  MONTHLY = 'Monthly',
  PACKAGE = 'Package',
  ATTENDANCE_BASED = 'Attendence Based',
  OTHER = 'Other',
}

export enum StudentStatus {
  DEMO = 'Demo',
  DEMO_NOT_JOINED = 'Demo But Not Joined',
  NEW = 'New',
  REGULAR = 'Regular',
  REJOINED = 'Rejoined',
  LEFT = 'Left',
  TEMPORARILY_LEFT = 'Temporarily Left',
  ON_BREAK = 'On Break',
  FEE_ARREARS = 'Fee Arrears',
  BLACKLIST = 'Blacklist',
  ABSENT = 'Absent',
  LEAVING_THIS_MONTH = 'Leaving This Month',
}

export enum LatestPaymentStatus {
  PAID = 'Paid',
  BALANCE = 'Balance',
  UNPAID = 'Unpaid',
  OVERDUE = 'Overdue',
  OVERDUE_5 = 'Overdue (5+ Days)',
  OVERDUE_10 = 'Overdue (10+ Days)',
  OVERDUE_15 = 'Overdue (15+ Days)',
  OVERDUE_30 = 'Overdue (30+ Days)',
  OVERDUE_60 = 'Overdue (60+ Days)',
  OVERDUE_90 = 'Overdue (90+ Days)',
}

/** Ordered escalation used by the overdue-tier classifier (Requirements §6.1). */
export const OVERDUE_STATUSES: LatestPaymentStatus[] = [
  LatestPaymentStatus.OVERDUE,
  LatestPaymentStatus.OVERDUE_5,
  LatestPaymentStatus.OVERDUE_10,
  LatestPaymentStatus.OVERDUE_15,
  LatestPaymentStatus.OVERDUE_30,
  LatestPaymentStatus.OVERDUE_60,
  LatestPaymentStatus.OVERDUE_90,
];

export enum OverdueThisMonth {
  YES = 'Yes',
  NO = 'No',
  CLEARED = 'Cleared',
}

/** Fee_Records.Payment_Status (as entered on a payment). */
export enum FeeRecordPaymentStatus {
  PAID_OR_CLEARED = 'Paid or Cleared',
  BALANCE = 'Balance',
}

/** Fee_Records.Save_Detail — controls syncing the fee profile to the student. */
export enum SaveDetail {
  YES = 'Yes',
  ONLY_FEE_TYPE = 'Only Fee Type',
  NO = 'No',
}

export enum AttendanceMarker {
  PRESENT = 'P',
  ABSENT = 'A',
  SCHEDULED_UNMARKED = '!',
  NONE = '',
}

export enum StudentAttendanceStatus {
  PRESENT = 'Present',
  ABSENT = 'Absent',
}

export enum PaymentMode {
  CASH = 'Cash',
  ONLINE = 'Online',
}

export enum SalaryType {
  FIXED = 'Fixed',
  CLASS_WISE = 'Class_Wise',
  PERCENTAGE = 'Percentage',
}

export enum EmployeeAttendanceStatus {
  PRESENT = 'Present',
  ABSENT = 'Absent',
  UNINFORMED_LEAVE = 'Uninformed Leave',
}

export enum ExpenseType {
  SALARY = 'Salary',
  REOCCURRING = 'Reoccurring',
  ONE_TIME = 'One-time',
}

export enum ExpenseStatus {
  UNPAID = 'Unpaid',
  PAID = 'Paid',
}

export enum ExpenseReferenceType {
  LAST_EXPENSE = 'Last Expense',
  LAST_YEAR = 'Last Year',
}

export enum BatchStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export enum EmployeeStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export enum EnquiryStatus {
  NEW = 'New',
  FOLLOW_UP = 'Follow-up',
  CALL_FOLLOW_UP = 'Call Follow-up',
  DEMO_SCHEDULED = 'Demo Scheduled',
  DEMO_ATTENDED = 'Demo Attended',
  CONVERTED = 'Converted',
  NEGOTIATING = 'Negotiating',
  LOST = 'Lost',
  TIME_NOT_SUITABLE = 'Time not suitable',
}

export enum DemoStatus {
  SCHEDULED = 'Scheduled',
  ATTENDED = 'Attended',
  MISSED = 'Missed',
  CANCELLED = 'Cancelled',
}

export enum FollowUpType {
  DEMO_SCHEDULED = 'Demo Scheduled',
  AUTOMATIC_FOLLOW_UP = 'Automatic Follow-up',
  NO_RESPONSE = 'No Response',
  TIME_NOT_SUITABLE = 'Time Not Suitable',
  LOST = 'Lost',
  MANUAL_FOLLOW_UP = 'Manual Follow-up',
  CONVERTED = 'Converted',
  NEGOTIATION = 'Negotiation',
}

export enum EnquiryActivityAction {
  SCHEDULE_DEMO = 'Schedule Demo',
  SCHEDULE_AUTOMATIC_FOLLOW_UP = 'Schedule Automatic Follow-up',
  SCHEDULE_MANUAL_FOLLOW_UP = 'Schedule Manual Follow-up',
  NEGOTIATION = 'Negotiation',
  TIME_NOT_SUITABLE = 'Time Not Suitable',
  MARK_LOST = 'Mark Lost',
  CONVERT_TO_STUDENT = 'Convert to Student',
  ADD_REMINDER = 'Add Reminder',
}

export enum RecordType {
  START_OF_MONTH = 'Start of the Month',
  END_OF_MONTH = 'End of the Month',
}

export enum WeekDay {
  MON = 'Monday',
  TUE = 'Tuesday',
  WED = 'Wednesday',
  THU = 'Thursday',
  FRI = 'Friday',
  SAT = 'Saturday',
  SUN = 'Sunday',
}

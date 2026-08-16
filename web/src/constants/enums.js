// Mirrors backend enum string values EXACTLY (some keep legacy Zoho spellings,
// e.g. "Attendence Based"). Used for dropdowns/filters.

export const ROLES = [
  'SUPER_ADMIN',
  'BRANCH_ADMIN',
  'STAFF',
  'TEACHER',
  'EMPLOYEE',
  'STUDENT',
  'PARENT',
];

export const ACTIVE_STATUS = ['Active', 'Inactive'];

export const ACTIVITY = [
  'Dance',
  'Fitness',
  'Vocal + Keyboard',
  'Guitar',
  'Wedding Choreography',
  'Gymnastics',
];

export const FEE_TYPE = ['Monthly', 'Package', 'Attendence Based', 'Other'];

export const STUDENT_STATUS = [
  'Demo',
  'Demo But Not Joined',
  'New',
  'Regular',
  'Rejoined',
  'Left',
  'Temporarily Left',
  'On Break',
  'Fee Arrears',
  'Blacklist',
  'Absent',
  'Leaving This Month',
];

export const LATEST_PAYMENT_STATUS = [
  'Paid',
  'Balance',
  'Unpaid',
  'Overdue',
  'Overdue (5+ Days)',
  'Overdue (10+ Days)',
  'Overdue (15+ Days)',
  'Overdue (30+ Days)',
  'Overdue (60+ Days)',
  'Overdue (90+ Days)',
];

export const OVERDUE_THIS_MONTH = ['Yes', 'No', 'Cleared'];

export const SALARY_TYPE = ['Fixed', 'Class_Wise', 'Percentage'];

export const BATCH_STATUS = ['Active', 'Inactive'];

export const EMPLOYEE_STATUS = ['Active', 'Inactive'];

export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const GENDER = ['Male', 'Female', 'Others'];

export const EXPENSE_TYPE = ['Salary', 'Reoccurring', 'One-time'];
export const EXPENSE_STATUS = ['Unpaid', 'Paid'];
export const EXPENSE_REF_TYPE = ['Last Expense', 'Last Year'];
export const EMP_ATTENDANCE_STATUS = ['Present', 'Absent', 'Uninformed Leave'];

export const ENQUIRY_STATUS = [
  'New',
  'Follow-up',
  'Call Follow-up',
  'Demo Scheduled',
  'Demo Attended',
  'Negotiating',
  'Converted',
  'Lost',
  'Time not suitable',
];
export const DEMO_STATUS = ['Scheduled', 'Attended', 'Missed', 'Cancelled'];
export const FOLLOWUP_TYPE = [
  'Demo Scheduled',
  'Automatic Follow-up',
  'No Response',
  'Time Not Suitable',
  'Lost',
  'Manual Follow-up',
  'Converted',
  'Negotiation',
];

// Roles allowed to write core data (mirrors backend guards; used to show/hide UI).
export const CAN_EDIT_CORE = ['SUPER_ADMIN', 'BRANCH_ADMIN'];
export const CAN_EDIT_STUDENTS = ['SUPER_ADMIN', 'BRANCH_ADMIN', 'STAFF'];
export const IS_SUPER_ADMIN = ['SUPER_ADMIN'];

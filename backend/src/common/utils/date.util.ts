/**
 * IST (Asia/Kolkata) date helpers (Requirements §31).
 * India observes NO daylight saving, so a fixed +05:30 offset is exact.
 * All business date math (month boundaries, due dates, overdue days,
 * payroll month, snapshots) must go through these — never raw UTC.
 */
const IST_OFFSET_MIN = 330;
const IST_OFFSET_MS = IST_OFFSET_MIN * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

interface ISTParts {
  year: number;
  month: number; // 0-based
  day: number;
  weekday: string;
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function nowIST(): Date {
  return new Date();
}

export function istParts(d: Date): ISTParts {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: WEEKDAYS[shifted.getUTCDay()],
  };
}

/** The instant of IST-midnight for the given y/m/d. */
function fromISTMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day) - IST_OFFSET_MS);
}

export function startOfDayIST(d: Date): Date {
  const p = istParts(d);
  return fromISTMidnight(p.year, p.month, p.day);
}

export function startOfMonthIST(d: Date): Date {
  const p = istParts(d);
  return fromISTMidnight(p.year, p.month, 1);
}

/** Last day of the month at IST-midnight (mirrors Zoho's addMonth(1).addDay(-1)). */
export function endOfMonthIST(d: Date): Date {
  const p = istParts(d);
  return fromISTMidnight(p.year, p.month + 1, 0);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

export function addMonthsIST(d: Date, n: number): Date {
  const p = istParts(d);
  return fromISTMidnight(p.year, p.month + n, p.day);
}

/** Whole days from a→b using IST day boundaries (b - a). */
export function daysBetweenIST(a: Date, b: Date): number {
  return Math.round(
    (startOfDayIST(b).getTime() - startOfDayIST(a).getTime()) / DAY_MS,
  );
}

export function weekdayIST(d: Date): string {
  return istParts(d).weekday;
}

/** Format as dd-MMM-yyyy (the Zoho display format). */
export function formatIST(d: Date): string {
  const p = istParts(d);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${String(p.day).padStart(2, '0')}-${months[p.month]}-${p.year}`;
}

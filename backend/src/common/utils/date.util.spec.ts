import {
  addDays,
  daysBetweenIST,
  endOfMonthIST,
  formatIST,
  startOfMonthIST,
  weekdayIST,
} from './date.util';

// These IST helpers underpin the fee/overdue/payroll/snapshot math (Requirements §31),
// so their boundaries must be exact. India has no DST → fixed +05:30.
describe('date.util (Asia/Kolkata)', () => {
  const sample = new Date('2026-08-12T10:00:00Z'); // 15:30 IST, Wed

  it('startOfMonthIST → 1st at IST-midnight', () => {
    expect(startOfMonthIST(sample).toISOString()).toBe('2026-07-31T18:30:00.000Z');
  });

  it('endOfMonthIST → last day at IST-midnight', () => {
    expect(endOfMonthIST(sample).toISOString()).toBe('2026-08-30T18:30:00.000Z');
  });

  it('daysBetweenIST counts whole IST days', () => {
    expect(
      daysBetweenIST(
        new Date('2026-08-01T00:00:00Z'),
        new Date('2026-08-11T00:00:00Z'),
      ),
    ).toBe(10);
  });

  it('addDays shifts by 24h', () => {
    expect(addDays(sample, 1).toISOString()).toBe('2026-08-13T10:00:00.000Z');
  });

  it('weekdayIST returns the IST weekday name', () => {
    expect(weekdayIST(sample)).toBe('Wednesday');
  });

  it('formatIST → dd-MMM-yyyy', () => {
    expect(formatIST(sample)).toBe('12-Aug-2026');
  });
});

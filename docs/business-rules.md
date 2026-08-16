# Business Rules

The authoritative business specification is **[`../Requirements.md`](../Requirements.md)** —
reverse-engineered from the Zoho Creator export. This file is a pointer + index so the spec
isn't duplicated (and can't drift).

Key sections to implement against:

| Requirements § | Topic | Implemented in (backend) |
|----------------|-------|--------------------------|
| §4 | Data model (collections + fields) | `*/schemas/*.schema.ts` |
| §5 | Enumerations | `common/enums/index.ts` |
| §6.1–6.2 | Fee due-date, payment status, overdue, expected amount | `fees/` (Phase 5) |
| §6.3 | Student-status state machine | `students/` status service (Phase 6) |
| §6.4 | 7-day attendance strip | `attendance/` (Phase 4) |
| §6.7 | Payroll (Fixed / Class-Wise / Percentage) | `payroll/` (Phase 7) |
| §6.8 | Recurring expenses | `expenses/` (Phase 7) |
| §6.9 | Batch-wise financial snapshot | `reports/`/`jobs/` (Phase 10/11) |
| §7 | Scheduled jobs (branch-parameterized) | `jobs/` (Phase 11) |
| §7.3 | Known Zoho bugs to resolve | tracked as decisions (see below) |

## Open decisions carried from Requirements §7.3 / §14

- **NIT 5 overdue bug:** both active Zoho overdue jobs filtered Jawahar Colony. The rebuild uses one
  branch-parameterized job, so both branches are covered correctly.
- **Student-status / attendance-strip jobs** were disabled in Zoho — the rebuild treats them as
  first-class daily jobs (confirm before go-live).
- **Payroll no-floor quirk** (`Absent − Free_Leaves` can go negative) — controlled by
  `PAYROLL_FLOOR_NEGATIVE_LEAVE_DEDUCTION` (default `false` = Zoho parity).

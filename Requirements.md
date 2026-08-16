# Live Arts ERP — Requirements

> **Status:** Draft v0.3 (reverse-engineered from Zoho Creator export; scheduled workflows + payroll now mapped)
> **Source:** `Live_Arts_ERP.ds` (Zoho Creator app "Live Arts ERP", exported 11-Aug-2026, author `rockcdancerr`)
> **Target stack:** React Native (mobile) · Node.js + Express (API) · MongoDB (database) · Redis + BullMQ (cache, sessions, scheduled jobs)
> **Locale:** `Asia/Kolkata` · currency ₹ · dates `dd-MMM-yyyy` · 24-hr time

---

## 1. Overview

A management ERP for a multi-branch performing-arts academy. It runs several activities — **Dance, Fitness, Vocal + Keyboard, Guitar, Wedding Choreography, Gymnastics** — across branches (currently **NIT 5** and **Jawahar Colony / "JC"**). It manages the full lifecycle: enquiry → demo → enrollment → attendance → fee cycles → overdue tracking → WhatsApp reminders → reporting.

The defining characteristics of this system (all present in the export, and what makes it *this* app rather than a generic academy ERP):

1. **Per-branch, computed fee state.** Every active student carries a derived `Latest_Due_Date`, `Latest_Payment_Status`, `Overdue_This_Month`, and `Expected_Amount_This_Month`, recomputed by scheduled jobs from their fee history. (§6.1–6.2)
2. **A rolling 7-day attendance "strip"** on each student (`Today`, `Yesterday`, `days3ago`…`days7ago`) using markers `P` / `A` / `!` / blank. (§6.4)
3. **An automated student-status state machine** driven by attendance (`New`, `Regular`, `Absent`, `Rejoined`, `On Break`, `Demo`, …). (§6.3)
4. **WhatsApp as the primary communication channel** — fee-received confirmations, dues reminders, follow-ups. (§6.5, §11)
5. **Three fee models:** Monthly, Package (multi-month), and Attendance-Based (pay-per-N-classes, due date extends with attendance). (§6.1)
6. **A payroll engine** — three salary models (Fixed / Class-Wise / Percentage-of-collection) that auto-post monthly salary rows into Expenses. (§6.7)
7. **Financial automation** — auto-generated recurring expenses and a monthly per-batch profit snapshot (revenue vs. allocated expense). (§6.8–6.9)

> This document is a rebuild spec. Zoho constructs are mapped to the target stack throughout: **Forms → Mongo collections + RN screens**, **Reports → filtered API list endpoints**, **Pages → RN dashboards**, **Standalone scheduled functions → BullMQ cron jobs**, **Form/button workflows → Express service logic**.

---

## 2. Tech Stack & Conventions

- **Mobile:** React Native (staff + admin; students/parents optional — see §10).
- **API:** Node.js + Express, REST under `/api/v1`, JWT auth (access + refresh; refresh in Redis).
- **DB:** MongoDB. Each core document carries `branchId`. Money in integer ₹.
- **Redis:** sessions/refresh tokens, cache (dashboards, lists), and **BullMQ** for the scheduled recompute jobs (§7) and WhatsApp send queue.
- **Audit:** the `Change_History` collection already exists in the source — keep it; log field changes on students (status, etc.) with actor + timestamp.

---

## 3. User Roles

Derived from the branch-specific dashboards (`User_Dashboard`, `User_Dashboard_JC`, `Admin_Dashboard_NIT`) and the "login user" audit writes in the source.

| Role | Access |
|------|--------|
| **Super Admin / Owner** | All branches, all modules, expenses/revenue, settings, staff. |
| **Branch Admin / Staff** | Their branch: students, attendance, fee collection, enquiries, dashboards. |
| **Teacher / Employee** | Assigned batches, mark attendance, own attendance. |
| **Student / Parent** *(optional, Phase 2)* | Own profile, schedule, attendance strip, dues, receipts. |

RBAC enforced at the API layer; every list/query is branch-scoped by default.

---

## 4. Data Model (MongoDB collections)

One collection per Zoho form. Field names below use the source names (rename to camelCase at build time, but keep a mapping for migration). Lookups (Zoho record links) become `ObjectId` refs.

### 4.1 `students` (form: **Student_Registration**, "Add Student")
Central entity. Notable fields:
- **Official:** `Form_No` (unique), `Active_Status` {Active, Inactive}, `Student_Status` {Demo, Demo But Not Joined, New, Regular, Rejoined, Left, Temporarily Left, On Break, Fee Arrears, Blacklist, Absent, Leaving This Month}, `Enter_Date`, `Reminder_Date`, `Student_Status_Remarks`, `Branch` (ref), `Batch_Management` (ref → batch), `Joining_Date`, `Actual_Joining_Date`.
- **Personal:** `Photo`, `Name` {prefix, first, last, suffix}, `Occupation`, `Date_of_Birth`, `Gender`, `Guardian_Name`/`Relation`/`Occupation`, `Guardian_2_*`, `Instagram`, `Phone_Number` (primary contact), `Primary_Contact_Person`, `Address`.
- **Fee profile:** `Preferred_Fee_Package` {Monthly, Package, Attendence Based}, `Monthly_Fee`, `Package_Fee`, `No_of_Months_in_Package`, `Attendence_Based_Fee`, `Validity_If_Attendence_Based`, `No_of_Classes_If_Attendence_Based`, `Balance`.
- **Computed (by jobs — do NOT hand-edit):** `Latest_Due_Date`, `Latest_Payment_Status` {Paid, Balance, Unpaid, Overdue, Overdue (5+/10+/15+/30+/60+/90+ Days)}, `Overdue_This_Month` {Yes, No, Cleared}, `Expected_Amount_This_Month`.
- **Attendance strip (computed):** `Today`, `Yesterday`, `days3ago`, `days4ago`, `days5ago`, `days6ago`, `days7ago` — each `P` | `A` | `!` | `""`.

> Status help-text rules from the form (keep as documented business rules):
> `(Active) On Break = Balance or Overdue < 10 days` · `(Inactive) Left = Paid or Overdue < 10 days` · `(Inactive) Fee Arrears = Balance`.

### 4.2 `feeRecords` (form: **Fee_Records**, "Fee Payment")
One row per payment/fee event. Fields:
- `payment_date`, `Student_Name` (ref → student, active only), `Branch`, `Batch`.
- `Fee_Type` {Monthly, Package, Attendence Based, Other}.
- `no_of_days_months` (Monthly = days [default 30]; Package = months), `No_of_Classes` (Attendance-Based paid classes).
- `Mode_of_Payment` {Cash, Online} with `Cash_Amount` + `Online_Amount` split.
- `Amount1` (fee amount), `Balance`, `Payment_Status` {Paid or Cleared, Balance}.
- `Old_Due_Date`, **`Ne` = new/next due date** (key field for due-date math), `Save_Detail` {Yes, Only Fee Type, No}, `Fee_Remarks`.
- Dues-summary helper fields (shown at entry): `Expected_Amount`, `Previous_Balance_If_Any`, `No_of_Day_or_Month_to_be_paid`, `Current_Fee_Package`, `Days_Overdue`, `No_of_Classes_to_be_Paid`.

### 4.3 `batches` (form: **Batch_Management**, "Add Batch")
`Batch_Name` (unique), `Branch` (ref), `Activity` {Dance, Fitness, Vocal + Keyboard, Guitar, Wedding Choreography, Gymnastics}, `Batch_Status` {Active, Inactive}, `Timings`, `Days` [Mon–Sun multi-select], `Teacher` (ref → employee), `Teacher_Phone`, `Monthly_Fee_B`, `Package_Fee_B`.

### 4.4 `branches` (form: **Branch**)
`Branch_Name`, contact/location. Seed: NIT 5 (`287579000000065017`), Jawahar Colony (`287579000000065011`) — keep old IDs in a migration map.

### 4.5 `studentAttendance` (form: **Student_Attendence**)
`Student_Name` (ref), `Date_field`, `Attendence` {Present, Absent}, `Batch`, `Branch`.

### 4.6 `employees` (form: **Employee_Registration**)
`Employee_Name` {prefix, first, last, suffix}, `Employee_Phone_Number`, `Employee_Active_Status`, `Branch`, `Batch_Management` (assigned batches, multi).
**Payroll profile:** `Salary_Type` {Fixed, Class_Wise, Percentage}, `Fixed_Salary`, `Class_Wise_Salary`, `Percentage`, `Free_Leaves`, `Deduction_Per_Leave`, `Deduction_Per_Uninformed_Leave`, `Extra_Incentive`.

### 4.7 `employeeAttendance` (form: **Employee_Attendance**)
`Employee_Name` (ref), `Emp_Att_Date`, `Employee_Attendance` {Present, Absent, Uninformed Leave}. Drives payroll leave deductions and Class-Wise pay.

### 4.8 CRM collections
- `enquiries` (**Enquiry_Form**): lead + `Enquiry_Status` {New, Follow-up, Call Follow-up, Demo Scheduled, Demo Attended, Converted, Negotiating, Lost, Time not suitable}.
- `demos` (**Demo_Form**): demo class + status {Scheduled, Attended, Missed, Cancelled}.
- `followUps` (**Follow_up_History**): `Type` {Demo Scheduled, Automatic Follow-up, No Response, Time Not Suitable, Lost, Manual Follow-up, Converted, Negotiation}.
- `enquiryActivity` (**Enquiries_Activity_History**): action log; actions {Schedule Demo, Schedule Automatic/Manual Follow-up, Negotiation, Time Not Suitable, Mark Lost, Convert to Student, Add Reminder}.

### 4.9 Finance & ops
- `expenses` (**Expenses**): `Expense_Title`, `Expense_Type` {Salary, Reoccurring, one-time}, `Expense_Status` {Unpaid, Paid}, `Expense_From_Date`, `Expense_To_Date`, `Expected_Expense`, `Expense_Amount`, `Assigned_Batches` (multi-ref; drives per-batch cost allocation), `Linked_Employee_If_Any` (ref, for salary rows), `Realtime_Salary_Calculation`. Recurring: `Auto_Add` {Yes/No}, `Reoccurring_Frequency` (months, numeric), `Derive_Expected_Expense_From` {Last Expense, Last Year}.
- `changeHistory` (**Change_History**): audit — `Added_User`, `Changed_By`, `Student_Registration` (ref), `Field_Changed`, `New_Value`, `Change_Date`, `Branch`.

> **Fee_Records note:** also has `Amount_Paid` (used by payroll % and batch-summary collection totals) alongside `Amount1` / `Cash_Amount` / `Online_Amount`.

### 4.10 Messaging
- `presetMessages` (**Preset_Messages**): reusable WhatsApp templates.
- `whatsappMessages` (**WhatsApp_Message_Form**): outbound WhatsApp send (`Student_Registration` ref, `Message`).

### 4.11 Reporting snapshots & helpers
- `batchWiseSummary` (**Batch_wise_Summary**): monthly per-batch financial + roster snapshot written by a scheduled job (§6.9). Fields: `Batch_Name` (ref), `Record_Type` {Start of the Month, End of the Month}, `Date_field`, `Total_Students`, `Demo`, `Absent`, `On_Break`, `Rejoined`, `Already_Paid`, `Cleared`, `Will_Pay`, `Pending_Expected_Amount`, `Actual_Collected_Amount`, `Total_Expected_Amount`, `Total_Expense`, `Actual_Profit_Collected`, `Expected_Profit`.
- `dateForPages` (**Date_For_Pages**): date-param helper for pages; likely just an API query param, not a collection.

**Indexes:** `branchId`; `students.Active_Status`, `students.Latest_Payment_Status`, `students.Latest_Due_Date`, `students.Batch_Management`; `feeRecords.Student_Name`, `feeRecords.Ne`; `studentAttendance.(Student_Name, Date_field)`.

---

## 5. Enumerations (single source of truth)

Keep these as shared constants (API + app):

- **Activity:** Dance · Fitness · Vocal + Keyboard · Guitar · Wedding Choreography · Gymnastics
- **Fee_Type:** Monthly · Package · Attendence Based · Other
- **Student_Status:** Demo · Demo But Not Joined · New · Regular · Rejoined · Left · Temporarily Left · On Break · Fee Arrears · Blacklist · Absent · Leaving This Month
- **Latest_Payment_Status:** Paid · Balance · Unpaid · Overdue · Overdue (5+/10+/15+/30+/60+/90+ Days)
- **Overdue_This_Month:** Yes · No · Cleared
- **Attendance marker:** `P` present · `A` absent · `!` scheduled class, unmarked · `""` no class / pre-joining
- **Mode_of_Payment:** Cash · Online
- **Salary_Type:** Fixed · Class_Wise · Percentage
- **Employee_Attendance:** Present · Absent · Uninformed Leave
- **Expense_Type:** Salary · Reoccurring · one-time · **Expense_Status:** Unpaid · Paid
- **Derive_Expected_Expense_From:** Last Expense · Last Year · **Record_Type:** Start of the Month · End of the Month

---

## 6. Core Business Logic (the heart of the rebuild)

These come from the standalone Deluge functions. Each currently exists **per branch** (NIT 5 and JC variants with the same logic but different branch filter). In the rebuild, **parameterize by `branchId`** — one implementation, not two.

### 6.1 Fee due-date & payment-status recompute
*(source: `manualfeeupdatenit` / `manualfeeupdateJC`)* — for each Active, not-On-Break student:
1. Find the **latest fee record where `Fee_Type != "Other"`**, ranked by `Ne` (next due date), tie-broken by `payment_date`.
2. Derive `Latest_Due_Date`:
   - **Attendence Based:** count `Present` records between `Old_Due_Date`..`Ne`. If `attended ≥ No_of_Classes`, due = `lastAttendedDate + 1 day`; else due = `Ne`.
   - **Monthly / Package / else:** due = `Ne`.
   - If latest `Ne < Joining_Date` and `Balance == 0`, or no fee records at all → due = `Joining_Date`, status = `Unpaid`.
3. Base status from record: `Paid or Cleared → Paid`, `Balance → Balance`.
4. **Overdue tiering** (unless Unpaid): `overdueDays = today − Latest_Due_Date`, then map to `Overdue` / `5+` / `10+` / `15+` / `30+` / `60+` / `90+ Days`.
5. Sync fee profile back to student when `Save_Detail == "Yes"` (Monthly→`Monthly_Fee`, Package→`Package_Fee`+`No_of_Months_in_Package`, Attendance→fee+validity+classes); `Save_Detail == "Only Fee Type"` updates only `Preferred_Fee_Package`. Always sync `Balance`.

### 6.2 Monthly overdue flag & expected amount
*(source: `manualoverdueupdate` / `manualupdateoverduejc`)* — monthly window `[startOfMonth, endOfMonth]`:
- Compute `Overdue_This_Month`:
  - No fee records → `Yes`, Balance 0.
  - `Ne > endOfMonth`: if `Old_Due_Date` within this month → `Cleared`, else `No`.
  - `Ne` within this month → `Yes`. Attendance-Based + already overdue → `Yes`.
- Compute `Expected_Amount_This_Month`:
  - `Cleared` / `No` → `Balance`.
  - `Yes` + **Monthly**: 60+ overdue → `3×Monthly_Fee + Balance`; 30+ → `2×Monthly_Fee + Balance`; else `1×Monthly_Fee + Balance`.
  - `Yes` + **Package** → `Package_Fee + Balance`.

### 6.3 Student-status state machine
*(source: `manual_student_status_update` / `updatestudentstatusjc`)* — for Active, not-On-Break students, from the latest 1–2 attendance records in the last 4–7 days:
- Two consecutive `Absent` → `Absent`.
- Latest `Present` while currently `Absent`, within 30 days of joining: `Rejoined` (if actual≠joining date) / `New` (paid) / `Demo` (unpaid) / else `Regular`.
- `On Break` + latest `Present` → `Rejoined`, reset `Joining_Date` to that date, **write a `Change_History` row**.
- Otherwise: ≤30 days since joining & paid → `New`; >30 days → `Regular`.

### 6.4 Rolling 7-day attendance strip
*(source: `manualupdateattendencejc` + NIT variant)* — for each active student, for today and the previous 6 days: look up attendance; if none and that weekday is in the batch's `Days` → `!`; if before `Joining_Date` or not a class day → `""`; else `P`/`A`. Write to `Today`…`days7ago`.

### 6.5 Fee message (WhatsApp)
*(source: `FeeMessage`)* — on fee received, build a confirmation ("received Rs. X, subscription extended to …" or, for `Other`, "received Rs. X for {Fee_Remarks}") and send via the WhatsApp message flow. `getAttendanceSummary(studentId)` builds a recent-attendance string for messages.

### 6.6 Interactive actions (buttons → API endpoints)
From button workflows on reports/dashboards: `markAttendanceOrOpenForm`, `markstudentabsent`, mark-present-for-whole-batch, `openFeeRecordForm`, `openWhatsAppMessageForm`, `openactionform` (enquiry), `add_attendence_record`, `Update_record_in_Student_`, `Open_Pay_Fee_Form`, `Send_Fee_Message1`.

### 6.7 Payroll → salary expenses
*(source: `Employee_Salary_to_Expens` monthly, `Realtime_Salary_Calculati` daily [inactive])* — for each Active employee, compute salary by `Salary_Type` over the current month:
- **Fixed:** `Fixed_Salary × max(batchCount, 1) − (Absent − Free_Leaves)×Deduction_Per_Leave − UninformedLeaves×Deduction_Per_Uninformed_Leave + Extra_Incentive`. *(batchCount = assigned batches / batches they teach.)*
- **Class_Wise:** `#Present days × Class_Wise_Salary`.
- **Percentage:** `(Percentage × collectionBase)/100 − deductions`, where `collectionBase` sums, over the employee's batch's Active non-On-Break students: `Expected_Amount_This_Month` if `Overdue_This_Month == "Yes"`, or their `Amount_Paid` fees this month if `"Cleared"`.
- **Monthly job:** insert an `Expenses` row `{Expense_Type: "Salary", Expense_Status: "Unpaid", Linked_Employee_If_Any, From/To = month}` when salary > 0.
- **Daily job (currently inactive):** prorated month-to-date salary; upserts that month's salary Expenses row.
> ⚠️ Parity note: the source computes `Absent − Free_Leaves` without a `max(0, …)` floor (negative leaves can *increase* pay). Flag for the rebuild — keep or fix explicitly.

### 6.8 Recurring expense auto-generation
*(source: `Auto_Add_Reoccuring_Expen`, monthly on the 1st)* — for each `Expenses` where `Auto_Add == "Yes"` and `Expense_Type == "Reoccurring"`: read `Reoccurring_Frequency` (months) and `Derive_Expected_Expense_From` (Last Expense = most recent same-title row; Last Year = same month last year, fallback to latest). If `monthsSinceReference` is a positive multiple of the frequency, insert a new expense for this month with `Expected_Expense` copied from the reference row.

### 6.9 Monthly batch-wise financial snapshot
*(source: `Batch_Wise_Report_Update`, monthly)* — for each Active batch, write one `batchWiseSummary` row:
- **Roster counts:** total active students; counts of Demo / Absent / On_Break / Rejoined; `Already_Paid` (Overdue=="No" & Paid), `Cleared` (Overdue=="Cleared" & Paid); `Will_Pay = total − (Already_Paid + Cleared)`.
- **Money:** `Pending_Expected_Amount = Σ Expected_Amount_This_Month` (non-paid students); `Actual_Collected_Amount = Σ Fee_Records.Amount_Paid` this month for the batch; `Total_Expected = pending + collected`.
- **Expense allocation per batch:** for each month's expense — no `Assigned_Batches` → `amount / #activeBatches`; assigned to N≥2 → `amount / N` for member batches; assigned to 1 → full amount to that batch. Sum = `Total_Expense`.
- **Profit:** `Actual_Profit_Collected = collected − Total_Expense`; `Expected_Profit = Total_Expected − Total_Expense`.
- `Record_Type` = "Start of the Month" if day ≤ 10 else "End of the Month".

---

## 7. Scheduled Jobs (Redis + BullMQ)

These are the **actual Zoho scheduled workflows** found in the export (11 total), with their real start time, frequency, on/off state, and branch scope. All run in `Asia/Kolkata`, in the **01:00–01:54** window. Rebuild each as a BullMQ repeatable job; the standalone `manual*` functions (§6) are the same logic exposed as a manual trigger — implement once, expose as **cron + on-demand**.

### 7.1 Active schedules (7)

| Zoho name | Time (IST) | Frequency | Scope | Effect (§ ref) |
|-----------|-----------|-----------|-------|----------------|
| `Update_Fee_Status_Daily` | 01:53 | Daily | NIT 5 (`…65017`) | Fee due-date + payment status (§6.1) |
| `Update_Fee_Status_Daily_JC` | 01:53 | Daily | JC (`…65011`) | Fee due-date + payment status (§6.1) |
| `Overdue` | 01:54 | Daily | **Jawahar Colony** | Overdue flag + expected amount (§6.2) |
| `Overdue_NIT` | 01:54 | Daily | **Jawahar Colony** ⚠️ | Overdue flag + expected amount (§6.2) |
| `Employee_Salary_to_Expens` | 01:00 | **Monthly (1st)** | All | Post salary → Expenses (§6.7) |
| `Auto_Add_Reoccuring_Expen` | 01:00 | **Monthly (1st)** | All | Generate recurring expenses (§6.8) |
| `Batch_Wise_Report_Update` | 01:00 | **Monthly** (starts 7th) | All active batches | Batch-wise profit snapshot (§6.9) |

### 7.2 Disabled in Zoho (`status = inactive`) — 4

| Zoho name | Frequency | Scope | Would do |
|-----------|-----------|-------|----------|
| `Update_Student_Status_` | Daily | NIT 5 | Student-status state machine (§6.3) |
| `Attendence1` | Daily | NIT 5 | 7-day attendance strip (§6.4) |
| `Student_Status_Attendence` | Daily | NIT 5 | Combined status + attendance strip |
| `Realtime_Salary_Calculati` | Daily | All | Prorated month-to-date salary (§6.7) |

### 7.3 ⚠️ Findings to resolve before rebuild (real gaps in the current Zoho setup)

1. **NIT 5 has no active overdue/expected recompute.** Both active overdue jobs (`Overdue`, `Overdue_NIT`) filter **Jawahar Colony** — `Overdue_NIT` is almost certainly a copy-paste bug that should target NIT 5. In the rebuild, one branch-parameterized job covers both correctly.
2. **Student status & attendance strip are not auto-updating** — every schedule that maintains `Student_Status` and `Today…days7ago` is **inactive**. Those fields are currently kept fresh only by manual runs / form workflows. Confirm the intended behavior (the rebuild should make these first-class daily jobs).
3. **Real-time daily salary is off** — only the month-1st salary post is active. Decide if daily proration is wanted.

### 7.4 Rebuild target — one daily runner, correct order

Collapse the per-branch duplicates into a single sequence, looped over branches:

**fee status (§6.1) → overdue + expected (§6.2) → student status (§6.3) → attendance strip (§6.4)**

Plus monthly jobs on the 1st: **salary→expenses (§6.7) → recurring expenses (§6.8)**, and the **batch-wise snapshot (§6.9)**. WhatsApp sends (§6.5) run as an on-demand/batched queue with retries.

---

## 8. Dashboards & Reports

### 8.1 Pages → RN dashboards
- **Admin_Dashboard_NIT** — revenue vs. expenses, batch-wise summary, active counts, per-branch KPIs (`Exp_Revenue`, `Exp_Revenue_NIT`, `Exp_revenue_JC`).
- **User_Dashboard / User_Dashboard_JC** — branch staff daily view (today's classes, attendance to mark, dues to collect).
- **Batch_Wise_Attendance** — mark attendance for a whole batch (bulk present/absent).
- **On_Break_Form**, **Print_Slip_Page**, **Fee_Receipt_Print_Page** (printable receipt), **xx** (batch-wise summary HTML).

### 8.2 Reports → filtered list endpoints
Branch-scoped variants exist for NIT 5 and JC; parameterize by branch + filter. Groups:
- **Students:** All / Active / Inactive-this-month / New-joinings / Rejoined / On-Break / Regular / branch-specific.
- **Fees:** Fee Report, Fee Pending, Will-Pay-This-Month, Other Payments.
- **Attendance:** Attendance Reports (+ branch variants), Batches-Active-Today.
- **Staff:** Employee list, Employee Attendance.
- **Expenses:** All Expenses.
- **CRM:** Enquiry, Demo, Follow-up, Enquiries Activity.
- **Audit:** Change History (+ branch variants).

---

## 9. API Surface (Express, `/api/v1`)

- `auth`: `/login`, `/refresh`, `/logout`
- `students`: CRUD, `/:id/fees`, `/:id/attendance`, `/:id/status`, list filters (branch, status, overdue)
- `fees`: create payment (records `feeRecords`, triggers recompute + WhatsApp), `/pending`, `/expected-this-month`
- `attendance`: `/mark` (single), `/batch/:batchId/mark` (bulk), reports
- `batches`, `branches`, `employees`, `employeeAttendance`
- `enquiries` / `demos` / `followUps` / `enquiryActivity` (CRM pipeline + actions)
- `expenses`
- `whatsapp`: `/send`, `/templates` (preset messages)
- `dashboard/*`, `reports/*`
- `jobs/*` (admin: trigger a recompute manually — mirrors the "manual…" functions)

---

## 10. Mobile App (React Native)

- **Staff/Admin (primary):** dashboards, mark attendance (batch + individual), collect fee (with live dues summary: expected, previous balance, days overdue, classes to pay), send WhatsApp, manage enquiries/demos, view reports, print/share receipt.
- **Offline attendance** capture with later sync (Phase 2).
- **Student/Parent (Phase 2):** profile, attendance strip, dues, receipts, reminders.
- Push notifications (FCM/APNs).

---

## 11. Integrations

- **WhatsApp Business API** — central (fee confirmations, dues reminders, follow-ups). Replaces the current `#Form:WhatsApp_Message_Form` popup + preset templates.
- **SMS/Email** — optional secondary reminders.
- **Payments** — currently **manual Cash/Online recording only** (no gateway in source). Online gateway is *future/optional* (§13), not part of parity.

---

## 12. Migration (Zoho → new stack)

- **Data:** export each form's records (CSV/API) → import to Mongo. Preserve Zoho record IDs in a `legacyId` field; build a branch-ID map (`…65017 → NIT 5`, `…65011 → Jawahar Colony`).
- **Lookups:** resolve Zoho ref IDs to Mongo `ObjectId` during import.
- **Recompute vs. import:** the computed fields (§6.1–6.4) can be re-derived after import by running the daily jobs once — no need to migrate their values.
- **Validation:** after import + first recompute, diff `Latest_Payment_Status` / `Expected_Amount_This_Month` against Zoho for a sample of students.

---

## 13. Explicitly NOT in the current system (future / confirm before adding)

The source has **none** of these — do not assume parity requires them: online payment gateway, events/competitions/recitals, certificates/grades, parent self-service login, multi-language. Add only if you want them beyond a like-for-like rebuild.

---

## 14. Open Questions

- [ ] **Confirm the §7.3 findings** — (a) should NIT 5 get its own overdue/expected recompute (fixing the `Overdue_NIT` branch bug)? (b) should student-status & attendance-strip jobs be **on** (they're disabled in Zoho)? (c) keep daily real-time salary off?
- [ ] Are NIT 5 / JC the only branches, or will more be added? (Logic is already branch-parameterized — good.)
- [ ] Payroll parity: keep the source's `Absent − Free_Leaves` (no zero-floor, §6.7) as-is, or fix so extra free leaves can't inflate salary?
- [ ] Confirm `Ne` = "next due date" naming and any other cryptic field meanings before renaming.
- [ ] Do you want the student/parent mobile app in scope, or staff/admin only for v1?
- [ ] WhatsApp: official Business API, or keep the current manual "open WhatsApp with prefilled message" behavior on mobile?

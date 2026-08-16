# Live Arts ERP — Poori Guide (Hinglish)

Ye document Live Arts ERP ke **har page aur har feature** ko simple Hinglish mein samjhata hai.
Jo bhi naya staff member system use karega, usko sirf ye file padhni hai — bas.

> **Note:** Saara business logic purane Zoho Creator app se hi liya gaya hai, isliye calculations
> (fees, due date, salary) bilkul waise hi chalte hain jaise pehle chalte the.

---

## Table of Contents

| # | Page | Kaam kya hai |
|---|------|--------------|
| 0 | [Login](#0-login-page) | System mein andar aana |
| 1 | [Dashboard](#1-dashboard) | Poore business ki ek nazar mein tasveer |
| 2 | [Students](#2-students) | Student ka master record |
| 3 | [Batches](#3-batches) | Class/batch banana aur manage karna |
| 4 | [Attendance](#4-attendance) | Roz ki haazri |
| 5 | [Fees](#5-fees) | Fees collect karna, due date, overdue |
| 6 | [Employees](#6-employees) | Staff/teacher ka record |
| 7 | [Payroll](#7-payroll) | Salary calculate aur post karna |
| 8 | [Expenses](#8-expenses) | Kharche |
| 9 | [CRM — Enquiries](#9-crm--enquiries) | Naye leads |
| 10 | [CRM — Demos](#10-crm--demos) | Demo class |
| 11 | [CRM — Follow-ups](#11-crm--follow-ups) | Follow-up calls |
| 12 | [Reports](#12-reports) | Saari reports ek jagah |
| 13 | [WhatsApp](#13-whatsapp) | Message bhejna |
| 14 | [Audit History](#14-audit-history) | Kis cheez mein kya change hua |
| 15 | [Branches](#15-branches) | Branch master (sirf Super Admin) |
| 16 | [Users](#16-users) | Login users banana (sirf Super Admin) |
| 17 | [Settings](#17-settings) | Profile, password, theme, system status |

Extra: [Roles](#roles--kaun-kya-kar-sakta-hai) · [Colours ka matlab](#colour-codes-ka-matlab) · [Rozana ka routine](#rozana-ka-routine-suggested)

---

## 0. Login Page

**Kya hai:** System ka darwaza. Email + password daal ke andar aate ho.

**Kaise use karein:**
1. Apna email daalein (jaise `admin@livearts.local`)
2. Password daalein
3. **Sign In** dabayein

**Zaroori baatein:**
- Login karte hi system aapka **role** aur **branch** dekh leta hai. Uske hisaab se hi aapko
  menu aur data dikhega. Agar aap Branch Admin ho to sirf apni branch ka data dikhega — ye
  server par lock hai, browser se badla nahi ja sakta.
- Session apne aap refresh hota rehta hai, baar baar login nahi karna padta.
- Password bhool gaye? Super Admin se bolo, wo Users page se reset kar dega.

---

## 1. Dashboard

**Kya hai:** Home page. Poore academy ka health check ek screen mein.

### Upar ke 4 bade KPI cards
| Card | Matlab |
|------|--------|
| **Revenue this month** | Is mahine ab tak kitna paisa aaya |
| **Expenses this month** | Is mahine kitna kharch hua |
| **Net profit** | Revenue − Expenses. Negative ho to laal dikhega |
| **Outstanding dues** | Kitna paisa abhi aana baaki hai + kitne students follow-up maangte hain |

Har card par ek chhota **trend pill** hota hai (jaise `↑ 12%`) — matlab **pichhle mahine ke
muqable** kitna upar/neeche gaya. Saath mein ek **mini graph (sparkline)** bhi hai jo 6 mahine
ka trend dikhata hai.

> Expenses card mein `↓` **green** hota hai (kharcha kam hua = achha) — baaki cards mein `↑` green hota hai.

### Neeche ke 4 chhote counters
Active students (total ke saath), Active batches, Staff, aur Collected today.

### Charts (graph)
| Chart | Kya batata hai |
|-------|----------------|
| **Revenue vs expenses** | 6 mahine ki line — orange = revenue, dark = expenses. Mouse le jao to exact figure dikhega |
| **Fee status** (donut) | Active students mein se kitne Paid / Balance / Unpaid / Overdue hain. Beech mein total, hover karo to us slice ka % |
| **Attendance (14 din)** | Roz ka Present vs Absent |
| **New admissions** | Har mahine kitne naye students aaye (bar ke upar number likha hota hai) |
| **Enquiry pipeline** | Kaunse stage par kitne leads hain |
| **How they paid** | Cash vs Online ka bantwara |

### Batch performance table
Har batch ka: students, collected, pending, cost, profit, aur **collection %** ka bar.
Bar ka rang — green (70%+ achha), gold (40–70% theek), laal (40% se kam = dhyan do).

### Activity panels (sabse neeche)
- **Needs follow-up** — jinki fees atki hai
- **Recent payments** — abhi abhi aayi payments
- **Latest enquiries** — naye leads

### Buttons
- **All branches** dropdown (sirf Super Admin) — kisi ek branch ka data dekhne ke liye
- **Recompute** — turant saare calculations dobara chala deta hai (fee status, student status, attendance strip)

---

## 2. Students

**Kya hai:** Har student ka poora record. Ye system ka dil hai.

**List page par:**
- Search box — naam ya phone se dhoondo
- Filters — status, batch, payment status
- Table mein: naam, batch, status, payment status, due date

**Naya student add karna:** `+ Add Student` → form bharo → Save.
Zaroori fields: naam, joining date, branch, batch, fee package.

**Student detail page** (kisi row par click karo) mein ye sab dikhta hai:
- Personal info (naam, DOB, gender, guardian, phone, address)
- Fee profile (monthly fee / package fee / attendance-based)
- **Latest payment status aur due date** — ye system khud calculate karta hai
- **7-din ki attendance strip** — `P` = present, `A` = absent, `!` = class thi par mark nahi hui
- Fee history, attendance history, change history

### Student Status (system khud badalta hai)
| Status | Kab lagta hai |
|--------|---------------|
| **Demo** | Sirf demo class li hai, admission nahi |
| **New** | Naya joined student |
| **Regular** | Theek chal raha hai |
| **Absent** | Lagataar aa nahi raha |
| **On Break** | Break par hai (aap manually set karte ho) |
| **Fee Arrears** | Fees bahut atki hui hai |
| **Left / Temporarily Left** | Chhod diya |
| **Rejoined** | Wapas aaya |

> Status apne aap change hota hai daily job se. Manual change bhi kar sakte ho — wo
> **Audit History** mein record ho jaata hai.

---

## 3. Batches

**Kya hai:** Class/batch ka master. Har student kisi na kisi batch mein hota hai.

**Batch mein ye set karte ho:**
- Batch name (jaise "Hip-Hop Beginners")
- Activity — Dance / Fitness / Vocal + Keyboard / Guitar / Gymnastics / Wedding Choreography
- Branch
- **Days** — hafte ke kaunse din class hai (ye attendance ke liye bahut zaroori hai)
- Timings
- Teacher
- Monthly fee / Package fee (default, student par override ho sakta hai)
- Status — Active / Inactive

> **Days theek se bharo.** Isi se system samajhta hai ki aaj class thi ya nahi, aur wahi
> attendance strip mein `!` (class thi par mark nahi hui) dikhata hai.

---

## 4. Attendance

**Kya hai:** Roz ki haazri lagane ka page.

Upar do **view** hain — **Mark** aur **By batch**.

### Mark view (haazri lagane ke liye)
1. Batch chuno
2. Date chuno (default aaj ki)
3. Poori list aa jayegi — har student ke saamne **Present / Absent** dabao
4. Ek saath poore batch ko bhi mark kar sakte ho (**Mark all present**)
5. **Save attendance** dabao

### By batch view (report dekhne ke liye)
Har batch ka attendance percentage ek table mein:
batch + activity + teacher + branch, schedule (din aur timing), students, sessions,
present, absent, aur **attendance rate** ka colour bar.

- Upar se **Last 7 / 30 / 90 days** range chun sakte ho
- Sabse upar overall percentage dikhta hai
- Rate ka rang — 🟢 85%+ achha · 🟡 70–85% theek · 🔴 70% se kam = dhyan do
- List sabse achhe rate wale batch se shuru hoti hai

> Isse turant pata chalta hai **kaunsa batch regular aa raha hai aur kaunsa nahi**.

**Zaroori baatein:**
- Ek student ka ek din mein sirf **ek hi** record ban sakta hai (duplicate protection hai).
  Dobara mark karoge to purana update ho jayega, naya nahi banega.
- Attendance ka asar **attendance-based fees** aur **student status** dono par padta hai.
- Saari dates IST (India time) mein calculate hoti hain.

---

## 5. Fees

**Kya hai:** Paisa collect karne ka page — sabse important page.

**Fees collect karna:**
1. Student chuno
2. **Fee type** chuno:
   - **Monthly** — mahine ke hisaab se
   - **Package** — package (jaise 3 mahine) ke hisaab se
   - **Attendence Based** — kitni classes li, uske hisaab se
   - **Other** — koi bhi custom amount
3. Days / months / classes daalo
4. System **khud amount calculate** karke dikha dega (live quote)
5. Cash / Online amount daalo
6. Save

**System khud kya nikalta hai:**
- **Amount** — fee type ke formula se (poora Zoho wala formula hi use hota hai)
- **Ne (next due date)** — agli fees kab deni hai
- **Balance** — agar poora paisa nahi diya
- **Payment status** — Paid or Cleared / Balance

**Extra options:** Previous balance, Waived off amount (chhoot), Extended days (due date aage badhana).

### Payment Status ka matlab
| Status | Matlab |
|--------|--------|
| **Paid** | Poora paisa aa gaya |
| **Balance** | Thoda diya, thoda baaki |
| **Unpaid** | Diya hi nahi |
| **Overdue (5+ / 10+ / 15+ / 30+ / 60+ / 90+ Days)** | Due date nikle itne din ho gaye |

> Jitne zyada din, utna gehra laal — turant follow-up karo.

**Fees collect karte hi WhatsApp confirmation** apne aap chala jaata hai (agar WhatsApp on hai).

---

## 6. Employees

**Kya hai:** Teacher aur staff ka record.

**Set karte ho:**
- Naam, phone, branch, active status
- Kaunse batches padhaate hain
- **Salary type** — ye payroll ke liye sabse zaroori hai:

| Salary Type | Kaise calculate hota hai |
|-------------|--------------------------|
| **Fixed** | Fixed salary × kitne batches (minimum 1) |
| **Class_Wise** | Kitne din present the × per-class rate |
| **Percentage** | Collection ka jitna % set kiya hai |

- Free leaves (kitni chhutti maaf)
- Deduction per leave / per uninformed leave
- Extra incentive

---

## 7. Payroll

**Kya hai:** Mahine ki salary nikalne ka page.

**Kaise chalta hai:**
1. Mahina chuno
2. **Calculate** dabao — har employee ki salary ban jayegi (attendance + salary type ke hisaab se)
3. Check karo — kitni present, kitni leave, kitna deduction, final amount
4. **Post salaries** dabao — ye salaries **Expenses** mein "Salary" type ke expense ban jaati hain

> **Post karna safe hai** — dobara post karoge to duplicate nahi banega, purana hi update hoga.

---

## 8. Expenses

**Kya hai:** Saare kharche.

**Expense types:**
| Type | Matlab |
|------|--------|
| **One-time** | Ek baar ka kharcha (jaise repair) |
| **Reoccurring** | Har mahine aane wala (rent, bijli, internet) |
| **Salary** | Payroll se apne aap banta hai |

**Recurring expense ke liye:** `Auto add` on karo, frequency (kitne mahine) set karo, aur
"expected expense" kahan se le — Last Expense ya Last Year.

Monthly job chalne par recurring expenses **apne aap ban jaate hain** (duplicate nahi bante).

**Assigned batches:** Agar kisi expense ko particular batch se jodo, to wo kharcha unhi batches
mein banta hai. Nahi jodo to saare active batches mein barabar bat jaata hai — isi se
**batch-wise profit** nikalta hai.

---

## 9. CRM — Enquiries

**Kya hai:** Naye leads ka pipeline. Jo log poochhne aaye par abhi join nahi kiye.

**Enquiry mein:** naam, phone, source (Instagram/Walk-in/Referral/Google), kis activity mein
interest hai, branch, next follow-up date.

### Status flow
`New → Follow-up → Demo Scheduled → Demo Attended → Negotiating → Converted`
(ya beech mein **Lost** / **Time not suitable**)

**Kya kar sakte ho:**
- Demo schedule karo
- Follow-up lagao (manual ya automatic)
- Activity/notes add karo — poori timeline ban jaati hai
- **Convert to Student** — ek click mein enquiry se student ban jaata hai, poori history saath jaati hai

---

## 10. CRM — Demos

**Kya hai:** Demo classes ka record.

**Status:** Scheduled → Attended / Missed / Cancelled.

Demo attend hone par enquiry ka status apne aap aage badh jaata hai.

---

## 11. CRM — Follow-ups

**Kya hai:** Kisko kab call karna hai uski list.

**Types:** Demo Scheduled, Automatic Follow-up, Manual Follow-up, No Response,
Time Not Suitable, Negotiation, Lost, Converted.

Roz is page ko kholo, jo due hain unko call karo, aur result note kar do.

---

## 12. Reports

**Kya hai:** Saari reports ka ek hub.

Upar cards hain — Students, Fees, Attendance, Employees, Payroll, Expenses, CRM.
Kisi par click karo, us module ki detail list khul jayegi.

Neeche **Batch-wise financial report** hai — har batch ka:
students, will pay, collected, pending, expense, expected profit.

> Ye report batati hai **kaunsa batch paisa bana raha hai aur kaunsa nahi**.

---

## 13. WhatsApp

**Kya hai:** Students/parents ko message bhejne ka page.

- **Templates** — pehle se bane message (fee confirmation, reminder waghera)
- **Message log** — kya bheja gaya, kisko, status kya raha (sent / queued / failed)
- Fees collect hote hi confirmation message apne aap jaata hai

> Abhi **mock provider** par hai (test mode). Real Meta WhatsApp API ka token daalte hi
> live messages chalu ho jayenge — code taiyaar hai.

---

## 14. Audit History

**Kya hai:** Kis record mein, kya field, kab, kisne badla — sab yahan likha hai.

**Har row mein:** Record (student ka naam + form no), Field, **purani value → nayi value**,
Branch, Changed by, aur Kab (jaise "5m ago").

- `System job` matlab automatic job ne badla, kisi insaan ne nahi
- Field aur branch se filter kar sakte ho, search bhi hai
- Sirf **Super Admin aur Branch Admin** ko dikhta hai

> Koi dispute ho ("fees to bhari thi!") to yahin se proof milta hai.

---

## 15. Branches

**Kya hai:** Branch master. **Sirf Super Admin** ko dikhta hai.

Abhi 2 branches hain: **NIT 5** aur **Jawahar Colony** (ye original Zoho app se aaye hain).

Har cheez branch se judi hoti hai — student, batch, fees, expense, staff. Branch Admin ko
sirf apni branch ka data milta hai, aur ye rule **server par** lagta hai (browser se tod nahi sakte).

---

## 16. Users

**Kya hai:** Login banane ka page. **Sirf Super Admin.**

**User banate waqt:** naam, email, password, role, aur branch (Super Admin ke alawa sabke liye branch zaroori hai).

---

## 17. Settings

**Kya hai:** Apni settings aur system ki health.

| Section | Kya hai |
|---------|---------|
| **Profile** | Aapka naam, email, role, scope. (Change Super Admin karega — Users page se) |
| **Appearance** | Light / Dark / System theme |
| **Change password** | Purana password + naya (kam se kam 8 character) |
| **System** *(admin)* | API, MongoDB, Redis, Scheduler ka live status + jobs manually chalane ke buttons |
| **Branches** *(admin)* | Branch list |
| **About** | Version, API address, timezone (IST) |

> **Password change karte hi aap saare devices se logout ho jaoge** — ye security ke liye hai.

---

## Roles — kaun kya kar sakta hai

| Role | Access |
|------|--------|
| **SUPER_ADMIN** | Sab kuch, saari branches. Branches aur Users bhi |
| **BRANCH_ADMIN** | Apni branch ka sab kuch (jobs bhi chala sakta hai) |
| **STAFF** | Roz ka kaam — students, attendance, fees, CRM |
| **TEACHER** | Apne batches aur attendance |
| **STUDENT / PARENT** | Sirf apna data (future ke liye) |

---

## Colour codes ka matlab

| Colour | Matlab |
|--------|--------|
| 🟢 **Teal / Green** | Sab theek — Paid, Active, Present, profit |
| 🟠 **Orange** | Brand colour — buttons, revenue, highlight |
| 🟡 **Gold** | Dhyan do — Balance, On Break, warning |
| 🔴 **Red** | Problem — Overdue, Absent, loss |
| 🟣 **Purple / Grey** | Neutral — Unpaid, Left, Inactive |

---

## Rozana ka routine (suggested)

**Roz subah**
1. **Dashboard** kholo — Outstanding dues aur Overdue count dekho
2. **Needs follow-up** panel se students ko call/WhatsApp karo
3. **CRM → Follow-ups** — aaj ke due follow-ups nipta do

**Roz shaam**
4. **Attendance** — har batch ki haazri lagao
5. **Fees** — din bhar ki payments enter karo

**Har mahine ki 1 tareekh**
6. **Payroll** — Calculate → Post salaries
7. **Expenses** — recurring check karo (rent, bijli)
8. **Reports → Batch-wise** — dekho kaunsa batch profit mein hai

> Daily aur monthly jobs apne aap chalne ke liye Redis on hona chahiye. Nahi hai to
> **Settings → System** se ya Dashboard ke **Recompute** button se manually chala lo.

---

## Kuch zaroori baatein (yaad rakho)

1. **Sab kuch IST mein** — koi timezone confusion nahi
2. **Fee/salary ke formule Zoho wale hi hain** — figures match karenge
3. **Branch ka data alag-alag hai**, aur ye server par lock hai
4. **Duplicate attendance nahi ban sakti** — ek student, ek din, ek record
5. **Salary post karna safe hai** — dobara karoge to duplicate nahi banega
6. **Har important change Audit History mein jaata hai**

---

*Live Arts ERP v1.0 · Ye guide app ke saath update hoti rahegi.*

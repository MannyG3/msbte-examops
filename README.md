# ExamOps — MSBTE Polytechnic Exam Management System

**ExamOps** is a multi-tenant web application built for **MSBTE (Maharashtra State Board of Technical Education)** affiliated diploma polytechnics to manage end-to-end institute-side examination operations—from class tests and practicals to theory seating arrangements, invigilation duties, detention rules, result analytics, and a student self-service portal.

- **Live Deployment:** [https://msbte-examops.vercel.app](https://msbte-examops.vercel.app)
- **Repository:** [https://github.com/MannyG3/msbte-examops](https://github.com/MannyG3/msbte-examops)

---

## Key Features

### 1. Multi-Tenant Architecture & Masters
- **Institute Isolation:** Every query, session, and document is scoped by `instituteId` so any polytechnic can onboard with its 4-digit MSBTE institute code.
- **Role-Based Access:** Supports `COORDINATOR`, `PRINCIPAL`, `HOD`, `FACULTY`, and `STUDENT` roles.
- **Curriculum & Schemes:** Supports **K Scheme** and **I Scheme** side by side with full assessment heads (`FA-TH`, `SA-TH`, `FA-PR`, `SA-PR`, `SLA`), max/min passing marks, and MSBTE tags (`@` Internal, `#` External, `*#` Online, `@$` Internal Online).
- **Forgiving CSV / Excel Importer:** Interactive column mapping UI, validation preview, error row reporting, and automatic semester course enrollment.
- **Audit Trail:** Immutable log (`AuditLog`) tracking before/after state for marks, seating, duty swaps, and master updates.

### 2. Theory Exam Operations
- **MSBTE Timetable & Scheme Parser:** Paste or upload timetable rows and automatically parse scheme strings (e.g., `CO-5-K`, `EE-3-I`) into programme, semester, and scheme.
- **Paper-to-Student Mapping:** Calculates per-session headcounts combining regular and backlog (`ATKT`) students with clash detection.
- **Alternating Bench Seating Generator:** Pure TypeScript greedy + constraint solver (`src/lib/schedulers/seating-generator.ts`) that mixes papers on 2-seater benches to prevent adjacent cheating, orders students sequentially by seat number, and supports manual seat swaps and room locking.
- **Print-Ready MSBTE Documents:** Room Door Seating Display Charts, Notice Board Seat-to-Room Master Lists, and Answer Book Packet Dispatch Summaries.

### 3. Supervision & Exam Day Console
- **Fair Duty Allocator:** Pure TypeScript scheduler (`src/lib/schedulers/duty-allocator.ts`) that balances load across staff, prevents self-subject invigilation conflicts, and avoids back-to-back Morning/Afternoon duties on the same day.
- **Duty Matrix & Appointment Letters:** Session-wide duty matrix and individual formal appointment orders for Junior Supervisors, Senior Supervisors, Relievers, and Peons.
- **Duty Swap Workflow:** Faculty can request swaps with peers; the Coordinator approves/rejects with automatic chart updates and audit logging.
- **Exam Day Console:** Room-wise live absentee marking, Unfair Means (UFM) logging, and answer book packet counts.

### 4. Practical / Oral Exams
- **Clash-Free Practical Planner:** Pure TypeScript scheduler (`src/lib/schedulers/practical-scheduler.ts`) supporting separate **Sem 1** and **Sem 3/5** MSBTE windows, skipping Sundays and holidays, and respecting lab equipment capacity.
- **External Examiner Directory & Letters:** Manage external examiners, pair them to `# External`-tagged slots, and print appointment orders and batch attendance/blank mark sheets.
- **Marks Entry & FA-PR Detention:** Batch-wise `FA-PR` and `SA-PR` entry with external sign-off lock and automatic **FA-PR detention** enforcement.

### 5. Class Tests (FA-TH) & Eligibility / Detention Engine
- **CT1 & CT2 Scheduler:** Division clash-free class test scheduling.
- **Keyboard & Excel-Paste Marks Grid:** Navigate with `Enter`/Arrow keys, paste directly from Excel, auto-compute `FA-TH` average, flag absentees (`AB`) and below-minimum students, and export clean MSBTE portal CSVs.
- **Eligibility & Detention Engine:** Configurable attendance threshold (default `75%`) + mandatory `FA-PR` pass rule, producing a printable division-wise detained student notice.

### 6. Session Dashboard & Results Analysis
- **Session Timeline & Checklist:** Phase countdowns and interactive readiness checklists.
- **MSBTE Result Analytics:** Import result CSVs to view overall pass %, course-wise pass rates, failure hotspots, toppers leaderboard, and exportable NBA/IQAC accreditation summaries.

### 7. Student Portal (`/portal/login`)
- Students log in with their **10-digit Enrollment Number** and **Seat/Roll Number** to view their eligibility status, practical batch schedule, and exact theory exam room, building, floor, bench, and seat position.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Database & ORM:** Prisma ORM (SQLite for zero-config local dev; PostgreSQL/Supabase ready for production)
- **Styling & Icons:** Tailwind CSS + Lucide React
- **Data Processing:** SheetJS (`xlsx`), PapaParse, `jose` (JWT auth), `bcryptjs`

---

## Local Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env`:
   ```env
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="examops_secret_key_change_in_production_2026"
   NEXT_PUBLIC_APP_NAME="ExamOps"
   ```

3. **Initialize database & seed demo data:**
   The seed script creates **Government Polytechnic, Pune (`0018`)** with 180 students (Sem 1, 3, 5), 30 staff, 12 rooms, 12 K/I-scheme courses, and a Winter 2026 (`W26`) timetable:
   ```bash
   npx prisma db push
   node prisma/seed.js
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

### Running Scheduler Unit Tests
```bash
npx tsx src/lib/schedulers/seating-generator.test.ts
npx tsx src/lib/schedulers/duty-allocator.test.ts
npx tsx src/lib/schedulers/practical-scheduler.test.ts
```

---

## Demo Credentials

### Staff Login (`/login`)
All demo accounts use password `admin123` (1-click quick login buttons are also available on `/login`):
- **Exam Coordinator:** `coordinator@gp-pune.ac.in`
- **Principal:** `principal@gp-pune.ac.in`
- **HOD (Computer Dept):** `hod.comp@gp-pune.ac.in`
- **Faculty:** `faculty@gp-pune.ac.in`

### Student Portal (`/portal/login`)
- **Sem 1 Student:** Enrollment `2400181001` / Seat `101001`
- **Sem 5 Student:** Enrollment `2400185001` / Seat `501001`

---

## Deploying to Vercel (Production)

For persistent production storage on Vercel serverless functions, connect a PostgreSQL database (Supabase, Neon, or Vercel Postgres):
1. Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`.
2. Set `DATABASE_URL` and `JWT_SECRET` in **Vercel Project Settings → Environment Variables**.
3. Run `npx prisma db push && node prisma/seed.js` against your Postgres database.

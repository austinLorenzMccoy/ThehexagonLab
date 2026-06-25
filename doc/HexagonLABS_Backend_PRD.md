# Hexagon LABS — Backend Product Requirements Document

> **Project name:** `ai-workers-hub`
> **Version:** 1.0 · June 2026
> **Stack:** Supabase (PostgreSQL + Auth + RLS + Edge Functions) · Next.js 14 API Routes · TypeScript

---

## Table of Contents

1. [Backend Architecture Overview](#1-backend-architecture-overview)
2. [Supabase Project Setup](#2-supabase-project-setup)
3. [Environment Variables](#3-environment-variables)
4. [Install Dependencies](#4-install-dependencies)
5. [TypeScript Types](#5-typescript-types)
6. [Supabase Client Files](#6-supabase-client-files)
7. [Database Schema — Full SQL (Run in Order)](#7-database-schema--full-sql-run-in-order)
8. [Row Level Security — Complete Policies](#8-row-level-security--complete-policies)
9. [Database Functions & Triggers — Full Implementation](#9-database-functions--triggers--full-implementation)
10. [Supabase Edge Functions](#10-supabase-edge-functions)
11. [Auth & Role Context](#11-auth--role-context)
12. [Middleware — Route & Role Protection](#12-middleware--route--role-protection)
13. [Data Layer — lib/db.ts](#13-data-layer--libdbts)
14. [Next.js API Routes](#14-nextjs-api-routes)
15. [Seeding from Excel Files](#15-seeding-from-excel-files)
16. [Real-time Subscriptions](#16-real-time-subscriptions)
17. [Step-by-Step Backend Build Guide](#17-step-by-step-backend-build-guide)
18. [Deployment Checklist](#18-deployment-checklist)
19. [Troubleshooting](#19-troubleshooting)

---

## 1. Backend Architecture Overview

### Data flow

```
Browser (Next.js client)
  └─ AuthContext
       └─ Supabase JS Client (@supabase/ssr)
            ├─ auth.users          → Supabase managed
            ├─ public.app_users    → roles, platform access, order flag
            ├─ public.platforms    → 9 platform definitions (read-only)
            ├─ public.platform_task_columns → per-platform task column defs
            ├─ public.worker_tracker        → job board tracker rows
            ├─ public.workers_registry      → worker registry rows
            ├─ public.orders       → Admin-only by default (RLS enforced)
            └─ public.payroll      → Admin + Manager only (RLS enforced)

Next.js Server
  ├─ middleware.ts         → session verification + role guard (edge)
  ├─ /api/admin/users      → GET/PATCH user roles (admin only, service_role key)
  ├─ /api/export/[table]   → CSV export endpoint (role-gated)
  └─ /api/tracker/task     → PATCH task_statuses JSONB (optimistic update helper)

Supabase Edge Functions (Deno)
  ├─ notify-warning        → fires when warning_level updated to Serious/Banned
  └─ daily-summary         → scheduled daily digest of platform stats (cron)

PostgreSQL Functions & Triggers
  ├─ handle_new_user()           → auto-creates app_users row on first sign-in
  ├─ update_updated_at_column()  → auto-timestamps on UPDATE
  ├─ handle_task_status_update() → logs task status change history
  ├─ notify_warning_escalation() → calls Edge Function via pg_net
  ├─ validate_task_statuses()    → enforces valid JSONB values
  ├─ get_my_role()               → RLS helper
  ├─ get_my_platforms()          → RLS helper
  └─ can_i_view_orders()         → RLS helper

Views
  ├─ public.order_summary    → per-platform order counts by status
  ├─ public.warning_summary  → per-platform warning counts
  └─ public.platform_stats   → combined stats per platform (dashboard)
```

### Key design decisions

| Decision | Rationale |
|---|---|
| RLS at the database layer | Even if application code has bugs, data isolation is enforced at the DB level. |
| task_statuses as JSONB | Each platform has different task columns. JSONB avoids dozens of nullable columns and allows dynamic column rendering from platform_task_columns. |
| Orders: Admin-only default | The can_view_orders boolean on app_users lets admin grant visibility per person. RLS enforces this — no application-level check can bypass it. |
| Service role key only in API routes | The admin client is only instantiated in server-side code. The browser client only uses the anon key. |
| Edge Functions for notifications | Heavy async work should not block the DB trigger cycle. Edge Functions handle this asynchronously. |

---

## 2. Supabase Project Setup

### Step 1 — Create the project

1. Go to supabase.com → sign in → New project
2. Fill in:
   - Project name: ai-workers-hub
   - Database password: generate strong password → copy and store securely
   - Region: choose closest to your users
3. Click Create new project → wait ~2 minutes

### Step 2 — Enable Google OAuth

1. Supabase dashboard → Authentication → Providers → Google → toggle Enable
2. In console.cloud.google.com:
   - Select or create a project
   - APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Authorised redirect URIs → add:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     http://localhost:3000/auth/callback
     ```
   - Save → copy Client ID and Client Secret
3. Back in Supabase → paste Client ID and Client Secret → Save

### Step 3 — Get project credentials

Supabase dashboard → Settings → API:
- Project URL → NEXT_PUBLIC_SUPABASE_URL
- anon public key → NEXT_PUBLIC_SUPABASE_ANON_KEY
- service_role key → SUPABASE_SERVICE_ROLE_KEY (server only — never expose)

### Step 4 — Install Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
```

---

## 3. Environment Variables

**.env.local** — never commit:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Edge Functions (optional — for notifications)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
NOTIFICATION_EMAIL=ops@yourcompany.com
```

**.env.example** — commit this:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
SLACK_WEBHOOK_URL=
NOTIFICATION_EMAIL=
```

---

## 4. Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D xlsx tsx dotenv
```

Generate TypeScript types after running the schema:

```bash
supabase gen types typescript \
  --project-id <your-project-ref> \
  > src/types/database.ts
```

---

## 5. TypeScript Types

### src/types/index.ts

```typescript
export type UserRole = 'admin' | 'manager' | 'supervisor' | 'worker'

export interface AppUser {
  id: string
  email: string
  display_name: string | null
  role: UserRole
  platform_access: string[] | null
  worker_id: string | null
  can_view_orders: boolean
  is_active: boolean
  last_sign_in: string | null
  created_at: string
  updated_at: string
}

export interface Platform {
  id: number
  slug: string
  label: string
  icon: string
  color_hex: string
  is_active: boolean
}

export interface PlatformTaskColumn {
  id: number
  platform_id: number
  column_key: string
  column_label: string
  sort_order: number
  is_active: boolean
}

export type YNStatus =
  | '✅ Yes' | '❌ No' | '⏳ Pending' | '🔄 In Progress' | '➖ N/A'

export type WarningLevel =
  | '🟢 Clear' | '🟡 Minor' | '🔴 Serious' | '⚫ Banned' | '➖ None'

export type OrderStatus =
  | '🟢 Active' | '🟡 Pending' | '🔵 Processing'
  | '🔴 Issue'  | '⚫ Cancelled' | '✅ Completed'

export type GeoworkStatus =
  | '✅ Passed' | '❌ Failed' | '⏳ Pending' | '🔄 Retake' | '⭕ Exempted'

export type AccountType =
  | 'Full-Time' | 'Part-Time' | 'Contractor' | 'Intern' | 'Freelance'

export type LinkerType =
  | 'Linker A' | 'Linker B' | 'Linker C' | 'Linker D' | 'Self'

export interface WorkerTrackerRow {
  id: string
  platform_id: number
  owner_name: string
  linker: LinkerType
  worker_name: string
  email: string | null
  apple_connect_pw: string | null
  platform_id_code: string | null
  payoneer_linked: YNStatus
  warning_level: WarningLevel
  sow_done: YNStatus
  le_cert: YNStatus
  task_statuses: Record<string, YNStatus>
  notes: string | null
  created_at: string
  updated_at: string
}

export interface WorkerRegistryRow {
  id: string
  platform_id: number
  project_task: string
  owner_name: string
  account_type: AccountType
  email: string | null
  passport: string | null
  geowork_test: GeoworkStatus
  date_started: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderRow {
  id: string
  platform_id: number
  order_id_code: string
  proxy: string | null
  owner_name: string
  status: OrderStatus
  order_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PayrollRow {
  id: string
  platform_id: number
  account_code: string
  worker_name: string
  month: string
  year: number
  tasks_done: number
  pay_usd: number
  notes: string | null
  created_at: string
}

export interface TaskStatusHistoryRow {
  id: string
  tracker_row_id: string
  column_key: string
  old_value: string | null
  new_value: string
  changed_by: string
  changed_at: string
}

export interface PlatformStatsRow {
  platform_id: number
  platform_slug: string
  platform_label: string
  icon: string
  color_hex: string
  total_workers: number
  clear_count: number
  minor_count: number
  serious_count: number
  banned_count: number
  total_orders: number
  issue_orders: number
  total_payroll_usd: number
}

export interface UserPermissions {
  canViewAllPlatforms: boolean
  canEditWorkers: boolean
  canViewOrders: boolean
  canEditOrders: boolean
  canViewPayroll: boolean
  canManageRoles: boolean
  canExport: boolean
  assignedPlatforms: string[] | null
}

export function getPermissions(user: AppUser): UserPermissions {
  return {
    canViewAllPlatforms: user.role === 'admin',
    canEditWorkers:      ['admin', 'manager', 'supervisor'].includes(user.role),
    canViewOrders:       user.role === 'admin' || user.can_view_orders,
    canEditOrders:       user.role === 'admin',
    canViewPayroll:      ['admin', 'manager'].includes(user.role),
    canManageRoles:      user.role === 'admin',
    canExport:           ['admin', 'manager'].includes(user.role),
    assignedPlatforms:   user.platform_access,
  }
}
```

---

## 6. Supabase Client Files

### src/lib/supabase/client.ts

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### src/lib/supabase/server.ts

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// Admin client — bypasses RLS. ONLY use in server-side API routes.
export function createAdminClient() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

---

## 7. Database Schema — Full SQL (Run in Order)

Open Supabase dashboard → SQL Editor → New query. Run each block in sequence.

### Block 1 — Extensions

```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
```

### Block 2 — Platforms

```sql
create table public.platforms (
  id         smallserial primary key,
  slug       text not null unique,
  label      text not null,
  icon       text not null,
  color_hex  text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.platforms (slug, label, icon, color_hex) values
  ('oneforma',        'Oneforma',        '🟣', '#8B5CF6'),
  ('telus',           'Telus',           '🔵', '#3B82F6'),
  ('data_annotation', 'Data Annotation', '🟢', '#10B981'),
  ('outlier',         'Outlier',         '🟠', '#F97316'),
  ('mercor_ai',       'Mercor AI',       '🩷', '#EC4899'),
  ('remotasks',       'Remotasks',       '🟡', '#EAB308'),
  ('appen',           'Appen',           '🔷', '#0EA5E9'),
  ('clickworker',     'Clickworker',     '🔶', '#F59E0B'),
  ('scale_ai',        'Scale AI',        '⚫', '#6B7280');
```

### Block 3 — App users

```sql
create table public.app_users (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  display_name    text,
  role            text not null default 'worker'
                  check (role in ('admin','manager','supervisor','worker')),
  platform_access text[] default null,
  worker_id       uuid,
  can_view_orders boolean not null default false,
  is_active       boolean not null default true,
  last_sign_in    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_app_users_role   on public.app_users(role);
create index idx_app_users_email  on public.app_users(email);
create index idx_app_users_worker on public.app_users(worker_id);
```

### Block 4 — Platform task columns (all 9 platforms seeded)

```sql
create table public.platform_task_columns (
  id           smallserial primary key,
  platform_id  smallint not null references public.platforms(id) on delete cascade,
  column_key   text not null,
  column_label text not null,
  sort_order   smallint not null default 0,
  is_active    boolean not null default true,
  unique(platform_id, column_key)
);

create index idx_task_cols_platform on public.platform_task_columns(platform_id);

-- Oneforma (18 columns)
insert into public.platform_task_columns (platform_id, column_key, column_label, sort_order)
select p.id, v.k, v.l, v.o from public.platforms p,
(values
  ('PR','PR',1),('TA MSG REPLY','TA MSG Reply',2),('VCG TTI','VCG TTI',3),
  ('VCG MSG BG','VCG MSG BG',4),('CYU WEBSITE TOPIC','CYU Website Topic',5),
  ('CYU','CYU',6),('AFM 3','AFM 3',7),('SAFETY AFM','Safety AFM',8),
  ('VCG EDIT MODEL','VCG Edit Model',9),('VCG BASE CREATION','VCG Base Creation',10),
  ('SMART REPLY','Smart Reply',11),('TA PROOFREAD 2.0','TA Proofread 2.0',12),
  ('CYU TOPIC SUMM.','CYU Topic Summ.',13),('TA 0-1 COMPOSITION','TA 0-1 Composition',14),
  ('CYU ACTION ITEMS','CYU Action Items',15),
  ('TA INTELLIGENT POLLS','TA Intelligent Polls',16),
  ('TA SMART REPLY PRAC.','TA Smart Reply Prac.',17),
  ('VCG ONEFORMA','VCG Oneforma',18)
) as v(k,l,o) where p.slug = 'oneforma';

-- Telus (11 columns)
insert into public.platform_task_columns (platform_id, column_key, column_label, sort_order)
select p.id, v.k, v.l, v.o from public.platforms p,
(values
  ('PR','PR',1),('GEOWORK TEST','Geowork Test',2),('ACCOUNT TYPE','Account Type',3),
  ('SIM ACTIVATION','SIM Activation',4),('KYC VERIFY','KYC Verify',5),
  ('PORTAL ONBOARD','Portal Onboard',6),('CREDIT CHECK','Credit Check',7),
  ('SYSTEM ACCESS','System Access',8),('TRAINING MODULE','Training Module',9),
  ('FINAL REVIEW','Final Review',10),('NETWORK CONFIG','Network Config',11)
) as v(k,l,o) where p.slug = 'telus';

-- Data Annotation (10 columns)
insert into public.platform_task_columns (platform_id, column_key, column_label, sort_order)
select p.id, v.k, v.l, v.o from public.platforms p,
(values
  ('PR','PR',1),('ANNOTATION TASK','Annotation Task',2),('QA CHECK','QA Check',3),
  ('LABEL REVIEW','Label Review',4),('DATA VALIDATION','Data Validation',5),
  ('MODEL FEEDBACK','Model Feedback',6),('BATCH SUBMITTED','Batch Submitted',7),
  ('ACCURACY CHECK','Accuracy Check',8),('GUIDELINE CERT','Guideline Cert',9),
  ('CALIBRATION','Calibration',10)
) as v(k,l,o) where p.slug = 'data_annotation';

-- Outlier (10 columns)
insert into public.platform_task_columns (platform_id, column_key, column_label, sort_order)
select p.id, v.k, v.l, v.o from public.platforms p,
(values
  ('PR','PR',1),('EVAL TASK','Eval Task',2),('MODEL FEEDBACK','Model Feedback',3),
  ('RED TEAMING','Red Teaming',4),('CREATIVE WRITING','Creative Writing',5),
  ('CODE REVIEW','Code Review',6),('MATH TASK','Math Task',7),
  ('REASONING TASK','Reasoning Task',8),('MULTILINGUAL','Multilingual',9),
  ('SAFETY REVIEW','Safety Review',10)
) as v(k,l,o) where p.slug = 'outlier';

-- Mercor AI (9 columns)
insert into public.platform_task_columns (platform_id, column_key, column_label, sort_order)
select p.id, v.k, v.l, v.o from public.platforms p,
(values
  ('PR','PR',1),('PROFILE REVIEW','Profile Review',2),('SKILL TEST','Skill Test',3),
  ('INTERVIEW','Interview',4),('CONTRACT','Contract',5),('ONBOARDING','Onboarding',6),
  ('FIRST TASK','First Task',7),('FEEDBACK LOOP','Feedback Loop',8),('RATING','Rating',9)
) as v(k,l,o) where p.slug = 'mercor_ai';

-- Remotasks (9 columns)
insert into public.platform_task_columns (platform_id, column_key, column_label, sort_order)
select p.id, v.k, v.l, v.o from public.platforms p,
(values
  ('PR','PR',1),('QUIZ PASSED','Quiz Passed',2),('TASK STARTED','Task Started',3),
  ('ACCURACY','Accuracy',4),('BATCHES DONE','Batches Done',5),
  ('LEVEL UP','Level Up',6),('BONUS TASK','Bonus Task',7),
  ('QUALITY SCORE','Quality Score',8),('PAYOUT LINKED','Payout Linked',9)
) as v(k,l,o) where p.slug = 'remotasks';

-- Appen (9 columns)
insert into public.platform_task_columns (platform_id, column_key, column_label, sort_order)
select p.id, v.k, v.l, v.o from public.platforms p,
(values
  ('PR','PR',1),('SCREENER TEST','Screener Test',2),('PROJECT ACCESS','Project Access',3),
  ('FIRST SUBMISSION','First Submission',4),('QA PASS','QA Pass',5),
  ('HOURS LOGGED','Hours Logged',6),('FEEDBACK DONE','Feedback Done',7),
  ('PAYMENT METHOD','Payment Method',8),('COMPLIANCE CERT','Compliance Cert',9)
) as v(k,l,o) where p.slug = 'appen';

-- Clickworker (8 columns)
insert into public.platform_task_columns (platform_id, column_key, column_label, sort_order)
select p.id, v.k, v.l, v.o from public.platforms p,
(values
  ('PR','PR',1),('REGISTRATION','Registration',2),('ASSESSMENT','Assessment',3),
  ('FIRST JOB','First Job',4),('QUALIFICATION','Qualification',5),
  ('VERIFIED','Verified',6),('PAYOUT SETUP','Payout Setup',7),
  ('ACTIVE STATUS','Active Status',8)
) as v(k,l,o) where p.slug = 'clickworker';

-- Scale AI (8 columns)
insert into public.platform_task_columns (platform_id, column_key, column_label, sort_order)
select p.id, v.k, v.l, v.o from public.platforms p,
(values
  ('PR','PR',1),('ONBOARDING','Onboarding',2),('TRAINING DONE','Training Done',3),
  ('FIRST TASK','First Task',4),('ACCURACY MET','Accuracy Met',5),
  ('TASKER LEVEL','Tasker Level',6),('PAYMENT SETUP','Payment Setup',7),
  ('ACTIVE','Active',8)
) as v(k,l,o) where p.slug = 'scale_ai';
```

### Block 5 — Worker tracker

```sql
create table public.worker_tracker (
  id               uuid primary key default uuid_generate_v4(),
  platform_id      smallint not null references public.platforms(id),
  owner_name       text not null,
  linker           text not null
                   check (linker in ('Linker A','Linker B','Linker C','Linker D','Self')),
  worker_name      text not null,
  email            text,
  apple_connect_pw text,
  platform_id_code text,
  payoneer_linked  text not null default '⏳ Pending'
                   check (payoneer_linked in ('✅ Yes','❌ No','⏳ Pending','🔄 In Progress','➖ N/A')),
  warning_level    text not null default '➖ None'
                   check (warning_level in ('🟢 Clear','🟡 Minor','🔴 Serious','⚫ Banned','➖ None')),
  sow_done         text not null default '⏳ Pending'
                   check (sow_done in ('✅ Yes','❌ No','⏳ Pending','🔄 In Progress','➖ N/A')),
  le_cert          text not null default '➖ N/A'
                   check (le_cert in ('✅ Yes','❌ No','⏳ Pending','🔄 In Progress','➖ N/A')),
  task_statuses    jsonb not null default '{}',
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_tracker_platform on public.worker_tracker(platform_id);
create index idx_tracker_owner    on public.worker_tracker(owner_name);
create index idx_tracker_warning  on public.worker_tracker(warning_level);
create index idx_tracker_tasks    on public.worker_tracker using gin(task_statuses);
```

### Block 6 — Task status history (audit log)

```sql
create table public.task_status_history (
  id             uuid primary key default uuid_generate_v4(),
  tracker_row_id uuid not null references public.worker_tracker(id) on delete cascade,
  column_key     text not null,
  old_value      text,
  new_value      text not null,
  changed_by     uuid references auth.users(id),
  changed_at     timestamptz not null default now()
);

create index idx_history_row     on public.task_status_history(tracker_row_id);
create index idx_history_changed on public.task_status_history(changed_at desc);
create index idx_history_user    on public.task_status_history(changed_by);
```

### Block 7 — Workers registry

```sql
create table public.workers_registry (
  id           uuid primary key default uuid_generate_v4(),
  platform_id  smallint not null references public.platforms(id),
  project_task text not null,
  owner_name   text not null,
  account_type text not null
               check (account_type in ('Full-Time','Part-Time','Contractor','Intern','Freelance')),
  email        text,
  passport     text,
  geowork_test text not null default '⏳ Pending'
               check (geowork_test in ('✅ Passed','❌ Failed','⏳ Pending','🔄 Retake','⭕ Exempted')),
  date_started date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_registry_platform on public.workers_registry(platform_id);
create index idx_registry_owner    on public.workers_registry(owner_name);
create index idx_registry_geowork  on public.workers_registry(geowork_test);
```

### Block 8 — Orders (Admin-only by default)

```sql
-- WRITE restricted to admin only via RLS.
-- READ granted conditionally via can_view_orders flag.
create table public.orders (
  id             uuid primary key default uuid_generate_v4(),
  platform_id    smallint not null references public.platforms(id),
  order_id_code  text not null unique,
  proxy          text,
  owner_name     text not null,
  status         text not null default '🟡 Pending'
                 check (status in (
                   '🟢 Active','🟡 Pending','🔵 Processing',
                   '🔴 Issue','⚫ Cancelled','✅ Completed'
                 )),
  order_date     date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_orders_platform on public.orders(platform_id);
create index idx_orders_status   on public.orders(status);
create index idx_orders_date     on public.orders(order_date desc);
```

### Block 9 — Payroll

```sql
create table public.payroll (
  id           uuid primary key default uuid_generate_v4(),
  platform_id  smallint not null references public.platforms(id),
  account_code text not null,
  worker_name  text not null,
  month        text not null
               check (month in (
                 'January','February','March','April','May','June',
                 'July','August','September','October','November','December'
               )),
  year         smallint not null default 2025
               check (year >= 2020 and year <= 2099),
  tasks_done   integer not null default 0 check (tasks_done >= 0),
  pay_usd      numeric(10,2) not null default 0 check (pay_usd >= 0),
  notes        text,
  created_at   timestamptz not null default now()
);

create index idx_payroll_platform on public.payroll(platform_id);
create index idx_payroll_worker   on public.payroll(worker_name);
create index idx_payroll_period   on public.payroll(year desc, month);
create unique index idx_payroll_unique
  on public.payroll(platform_id, account_code, worker_name, month, year);
```

### Block 10 — Dashboard views

```sql
create or replace view public.warning_summary as
  select
    p.id as platform_id, p.slug as platform_slug, p.label as platform_label,
    p.icon, p.color_hex,
    count(*)                                                  as total_workers,
    count(*) filter (where wt.warning_level = '🟢 Clear')    as clear_count,
    count(*) filter (where wt.warning_level = '🟡 Minor')    as minor_count,
    count(*) filter (where wt.warning_level = '🔴 Serious')  as serious_count,
    count(*) filter (where wt.warning_level = '⚫ Banned')   as banned_count
  from public.worker_tracker wt
  join public.platforms p on p.id = wt.platform_id
  group by p.id, p.slug, p.label, p.icon, p.color_hex;

create or replace view public.order_summary as
  select
    p.id as platform_id, p.slug as platform_slug, p.label as platform_label, p.icon,
    count(*)                                                       as total_orders,
    count(*) filter (where o.status = '🟢 Active')                as active_count,
    count(*) filter (where o.status = '🟡 Pending')               as pending_count,
    count(*) filter (where o.status = '🔵 Processing')            as processing_count,
    count(*) filter (where o.status = '🔴 Issue')                 as issue_count,
    count(*) filter (where o.status = '✅ Completed')              as completed_count,
    count(*) filter (where o.status = '⚫ Cancelled')              as cancelled_count
  from public.orders o
  join public.platforms p on p.id = o.platform_id
  group by p.id, p.slug, p.label, p.icon;

create or replace view public.platform_stats as
  select
    p.id as platform_id, p.slug as platform_slug, p.label as platform_label,
    p.icon, p.color_hex,
    coalesce(ws.total_workers, 0)  as total_workers,
    coalesce(ws.clear_count, 0)    as clear_count,
    coalesce(ws.minor_count, 0)    as minor_count,
    coalesce(ws.serious_count, 0)  as serious_count,
    coalesce(ws.banned_count, 0)   as banned_count,
    coalesce(os.total_orders, 0)   as total_orders,
    coalesce(os.issue_count, 0)    as issue_orders,
    coalesce(pr.total_pay, 0)      as total_payroll_usd
  from public.platforms p
  left join public.warning_summary ws on ws.platform_id = p.id
  left join public.order_summary   os on os.platform_id = p.id
  left join (
    select platform_id, sum(pay_usd) as total_pay
    from public.payroll
    where year = date_part('year', now())::smallint
    group by platform_id
  ) pr on pr.platform_id = p.id;
```

---

## 8. Row Level Security — Complete Policies

Run this entire block after the schema blocks.

```sql
-- Enable RLS on every table
alter table public.app_users             enable row level security;
alter table public.platforms             enable row level security;
alter table public.platform_task_columns enable row level security;
alter table public.worker_tracker        enable row level security;
alter table public.task_status_history   enable row level security;
alter table public.workers_registry      enable row level security;
alter table public.orders                enable row level security;
alter table public.payroll               enable row level security;

-- ── RLS helper functions ──────────────────────────────────────────
-- security definer: runs as the function owner, bypassing RLS on app_users
-- so the helpers can read the current user's role even when RLS would block it.

create or replace function public.get_my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.app_users where id = auth.uid() limit 1;
$$;

create or replace function public.get_my_platforms()
returns text[] language sql stable security definer set search_path = public as $$
  select platform_access from public.app_users where id = auth.uid() limit 1;
$$;

create or replace function public.can_i_view_orders()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(can_view_orders, false)
  from public.app_users where id = auth.uid() limit 1;
$$;

create or replace function public.get_my_worker_id()
returns uuid language sql stable security definer set search_path = public as $$
  select worker_id from public.app_users where id = auth.uid() limit 1;
$$;

-- ── platforms: read-only for all authenticated users ──────────────
create policy "platforms_select" on public.platforms for select
  using (auth.uid() is not null);

-- ── platform_task_columns: read-only for all authenticated ────────
create policy "task_columns_select" on public.platform_task_columns for select
  using (auth.uid() is not null);

-- ── app_users ─────────────────────────────────────────────────────
create policy "app_users_select" on public.app_users for select
  using (auth.uid() = id or public.get_my_role() = 'admin');

create policy "app_users_insert" on public.app_users for insert
  with check (auth.uid() = id or public.get_my_role() = 'admin');

create policy "app_users_update" on public.app_users for update
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "app_users_delete" on public.app_users for delete
  using (public.get_my_role() = 'admin');

-- ── worker_tracker ────────────────────────────────────────────────
create policy "tracker_select" on public.worker_tracker for select
  using (
    case public.get_my_role()
      when 'admin' then true
      when 'manager' then
        platform_id in (select p.id from public.platforms p
          where p.slug = any(coalesce(public.get_my_platforms(), array[]::text[])))
      when 'supervisor' then
        platform_id in (select p.id from public.platforms p
          where p.slug = any(coalesce(public.get_my_platforms(), array[]::text[])))
      when 'worker' then id = public.get_my_worker_id()
      else false
    end
  );

create policy "tracker_insert" on public.worker_tracker for insert
  with check (
    case public.get_my_role()
      when 'admin' then true
      when 'manager' then
        platform_id in (select p.id from public.platforms p
          where p.slug = any(coalesce(public.get_my_platforms(), array[]::text[])))
      else false
    end
  );

create policy "tracker_update" on public.worker_tracker for update
  using (
    case public.get_my_role()
      when 'admin' then true
      when 'manager' then
        platform_id in (select p.id from public.platforms p
          where p.slug = any(coalesce(public.get_my_platforms(), array[]::text[])))
      when 'supervisor' then
        platform_id in (select p.id from public.platforms p
          where p.slug = any(coalesce(public.get_my_platforms(), array[]::text[])))
      else false
    end
  );

create policy "tracker_delete" on public.worker_tracker for delete
  using (public.get_my_role() = 'admin');

-- ── task_status_history (append-only audit log) ───────────────────
create policy "history_select" on public.task_status_history for select
  using (public.get_my_role() in ('admin','manager') or changed_by = auth.uid());

create policy "history_insert" on public.task_status_history for insert
  with check (public.get_my_role() in ('admin','manager','supervisor'));

-- ── workers_registry ──────────────────────────────────────────────
create policy "registry_select" on public.workers_registry for select
  using (
    case public.get_my_role()
      when 'admin' then true
      when 'manager' then
        platform_id in (select p.id from public.platforms p
          where p.slug = any(coalesce(public.get_my_platforms(), array[]::text[])))
      when 'supervisor' then
        platform_id in (select p.id from public.platforms p
          where p.slug = any(coalesce(public.get_my_platforms(), array[]::text[])))
      else false
    end
  );

create policy "registry_insert" on public.workers_registry for insert
  with check (public.get_my_role() in ('admin','manager'));

create policy "registry_update" on public.workers_registry for update
  using (public.get_my_role() in ('admin','manager'));

create policy "registry_delete" on public.workers_registry for delete
  using (public.get_my_role() = 'admin');

-- ── orders ────────────────────────────────────────────────────────
-- WRITE: admin ONLY — no exceptions
-- READ:  admin always; manager/supervisor only if can_view_orders = true
create policy "orders_select" on public.orders for select
  using (
    public.get_my_role() = 'admin'
    or (
      public.can_i_view_orders() = true
      and public.get_my_role() in ('manager','supervisor')
      and platform_id in (select p.id from public.platforms p
        where p.slug = any(coalesce(public.get_my_platforms(), array[]::text[])))
    )
  );

create policy "orders_insert" on public.orders for insert
  with check (public.get_my_role() = 'admin');

create policy "orders_update" on public.orders for update
  using (public.get_my_role() = 'admin');

create policy "orders_delete" on public.orders for delete
  using (public.get_my_role() = 'admin');

-- ── payroll ───────────────────────────────────────────────────────
create policy "payroll_select" on public.payroll for select
  using (public.get_my_role() in ('admin','manager'));

create policy "payroll_insert" on public.payroll for insert
  with check (public.get_my_role() in ('admin','manager'));

create policy "payroll_update" on public.payroll for update
  using (public.get_my_role() in ('admin','manager'));

create policy "payroll_delete" on public.payroll for delete
  using (public.get_my_role() = 'admin');
```

---

## 9. Database Functions & Triggers — Full Implementation

Run this entire block after the RLS block.

```sql
-- ── 1. Auto-update updated_at ─────────────────────────────────────
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger app_users_updated_at
  before update on public.app_users
  for each row execute function public.update_updated_at_column();

create trigger worker_tracker_updated_at
  before update on public.worker_tracker
  for each row execute function public.update_updated_at_column();

create trigger workers_registry_updated_at
  before update on public.workers_registry
  for each row execute function public.update_updated_at_column();

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.update_updated_at_column();

-- ── 2. Auto-create app_users row on first sign-in ─────────────────
-- New users get role='worker'. Admin must explicitly promote them.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_users (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    'worker'
  )
  on conflict (id) do update
    set email        = excluded.email,
        display_name = coalesce(public.app_users.display_name, excluded.display_name),
        last_sign_in = now();
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Update last_sign_in on every subsequent sign-in
create or replace function public.handle_user_signin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update public.app_users set last_sign_in = now() where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_signin
  after update on auth.users
  for each row execute function public.handle_user_signin();

-- ── 3. Log every status change to task_status_history ─────────────
create or replace function public.handle_task_status_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_key text;
  v_old text;
  v_new text;
begin
  -- Core status columns
  if new.warning_level is distinct from old.warning_level then
    insert into public.task_status_history
      (tracker_row_id, column_key, old_value, new_value, changed_by)
    values (new.id, 'warning_level', old.warning_level, new.warning_level, auth.uid());
  end if;

  if new.payoneer_linked is distinct from old.payoneer_linked then
    insert into public.task_status_history
      (tracker_row_id, column_key, old_value, new_value, changed_by)
    values (new.id, 'payoneer_linked', old.payoneer_linked, new.payoneer_linked, auth.uid());
  end if;

  if new.sow_done is distinct from old.sow_done then
    insert into public.task_status_history
      (tracker_row_id, column_key, old_value, new_value, changed_by)
    values (new.id, 'sow_done', old.sow_done, new.sow_done, auth.uid());
  end if;

  if new.le_cert is distinct from old.le_cert then
    insert into public.task_status_history
      (tracker_row_id, column_key, old_value, new_value, changed_by)
    values (new.id, 'le_cert', old.le_cert, new.le_cert, auth.uid());
  end if;

  -- JSONB task_statuses: log each changed key individually
  if new.task_statuses is distinct from old.task_statuses then
    for v_key in
      select key from jsonb_each_text(new.task_statuses)
      union
      select key from jsonb_each_text(old.task_statuses)
    loop
      v_old := old.task_statuses ->> v_key;
      v_new := new.task_statuses ->> v_key;
      if v_new is distinct from v_old then
        insert into public.task_status_history
          (tracker_row_id, column_key, old_value, new_value, changed_by)
        values (new.id, v_key, v_old, v_new, auth.uid());
      end if;
    end loop;
  end if;

  return new;
end;
$$;

create trigger worker_tracker_history
  after update on public.worker_tracker
  for each row execute function public.handle_task_status_update();

-- ── 4. Notify Edge Function when warning escalates to Serious/Banned
-- Requires pg_net extension (pre-installed on all Supabase projects)
-- and the app.supabase_url + app.service_role_key DB settings below.
create or replace function public.notify_warning_escalation()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
begin
  if new.warning_level in ('🔴 Serious','⚫ Banned')
     and (old.warning_level is null
          or old.warning_level not in ('🔴 Serious','⚫ Banned'))
  then
    perform net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/notify-warning',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'tracker_row_id', new.id,
        'worker_name',    new.worker_name,
        'owner_name',     new.owner_name,
        'warning_level',  new.warning_level,
        'platform_id',    new.platform_id
      )::text
    );
  end if;
  return new;
end;
$$;

create trigger warning_escalation_notify
  after update on public.worker_tracker
  for each row execute function public.notify_warning_escalation();

-- ── 5. Set DB-level settings used by pg_net trigger ───────────────
-- Replace the placeholder values with your actual credentials
alter database postgres
  set app.supabase_url = 'https://xxxxxxxxxxxx.supabase.co';

alter database postgres
  set app.service_role_key = 'eyJ...your_actual_service_role_key...';

-- ── 6. Validate JSONB task_statuses values on insert/update ───────
create or replace function public.validate_task_statuses()
returns trigger language plpgsql as $$
declare
  v_value text;
  v_allowed text[] := array[
    '✅ Yes','❌ No','⏳ Pending','🔄 In Progress','➖ N/A'
  ];
begin
  for v_value in select value from jsonb_each_text(new.task_statuses) loop
    if v_value <> all(v_allowed) then
      raise exception
        'Invalid task status value: %. Allowed: %',
        v_value, array_to_string(v_allowed, ', ');
    end if;
  end loop;
  return new;
end;
$$;

create trigger tracker_validate_tasks
  before insert or update on public.worker_tracker
  for each row execute function public.validate_task_statuses();

-- ── 7. Enable pg_cron and schedule daily summary ──────────────────
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Fires daily at 08:00 UTC — calls the daily-summary Edge Function
select cron.schedule(
  'daily-platform-summary',
  '0 8 * * *',
  $$
    select net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/daily-summary',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body := '{}'
    );
  $$
);

-- ── 8. Enable real-time for tracker and orders tables ─────────────
alter publication supabase_realtime add table public.worker_tracker;
alter publication supabase_realtime add table public.orders;
```

---

## 10. Supabase Edge Functions

### Setup

```bash
supabase functions new notify-warning
supabase functions new daily-summary
```

### Function 1 — notify-warning

**supabase/functions/notify-warning/index.ts**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SLACK_WEBHOOK_URL    = Deno.env.get('SLACK_WEBHOOK_URL')
const NOTIFICATION_EMAIL   = Deno.env.get('NOTIFICATION_EMAIL')

serve(async (req) => {
  try {
    const { tracker_row_id, worker_name, owner_name, warning_level, platform_id } =
      await req.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: platform } = await supabase
      .from('platforms').select('label, icon').eq('id', platform_id).single()

    const platformLabel = platform ? `${platform.icon} ${platform.label}` : 'Unknown'
    const isBanned  = warning_level === '⚫ Banned'
    const severity  = isBanned ? 'BANNED' : 'SERIOUS WARNING'
    const emoji     = isBanned ? '🚨' : '⚠️'

    const message =
      `${emoji} *${severity}* — ${platformLabel}\n` +
      `Worker: *${worker_name}*\n` +
      `Owner: ${owner_name}\n` +
      `Status: ${warning_level}\n` +
      `Tracker ID: \`${tracker_row_id}\``

    if (SLACK_WEBHOOK_URL) {
      await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (error) {
    console.error('notify-warning error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
```

### Function 2 — daily-summary

**supabase/functions/daily-summary/index.ts**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SLACK_WEBHOOK_URL    = Deno.env.get('SLACK_WEBHOOK_URL')

serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: stats, error } = await supabase
    .from('platform_stats').select('*').order('total_workers', { ascending: false })

  if (error || !stats) {
    return new Response(JSON.stringify({ error: error?.message ?? 'No data' }), { status: 500 })
  }

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  let summary = `📊 *Hexagon LABS Daily Summary — ${today}*\n\n`

  for (const p of stats) {
    const hasIssues = p.banned_count > 0 || p.serious_count > 0 || p.issue_orders > 0
    summary += `${hasIssues ? '🔴' : '🟢'} *${p.icon} ${p.platform_label}*\n`
    summary += `  Workers: ${p.total_workers} · Clear: ${p.clear_count} · `
    summary += `Warnings: ${p.minor_count + p.serious_count} · Banned: ${p.banned_count}\n`
    if (p.total_orders > 0) summary += `  Orders: ${p.total_orders} · Issues: ${p.issue_orders}\n`
    summary += '\n'
  }

  const totBanned  = stats.reduce((a, p) => a + p.banned_count, 0)
  const totIssues  = stats.reduce((a, p) => a + p.issue_orders, 0)
  const totWorkers = stats.reduce((a, p) => a + p.total_workers, 0)
  summary += `*Totals:* ${totWorkers} workers · ${totBanned} banned · ${totIssues} order issues`

  if (SLACK_WEBHOOK_URL) {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: summary }),
    })
  }

  return new Response(JSON.stringify({ success: true, platforms: stats.length }), {
    headers: { 'Content-Type': 'application/json' }, status: 200,
  })
})
```

### Deploy Edge Functions

```bash
supabase functions deploy notify-warning
supabase functions deploy daily-summary

supabase secrets set \
  SLACK_WEBHOOK_URL=https://hooks.slack.com/services/... \
  NOTIFICATION_EMAIL=ops@yourcompany.com \
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 11. Auth & Role Context

### src/contexts/AuthContext.tsx

```typescript
'use client'
import {
  createContext, useContext, useEffect,
  useState, useCallback, type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { AppUser, UserPermissions } from '@/types'
import { getPermissions } from '@/types'

interface AuthContextValue {
  user:             User | null
  session:          Session | null
  appUser:          AppUser | null
  permissions:      UserPermissions | null
  isLoading:        boolean
  signInWithGoogle: () => Promise<void>
  signOut:          () => Promise<void>
  refreshAppUser:   () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const [user,      setUser]      = useState<User | null>(null)
  const [session,   setSession]   = useState<Session | null>(null)
  const [appUser,   setAppUser]   = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadAppUser = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('app_users').select('*').eq('id', userId).single()
    if (data) setAppUser(data as AppUser)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadAppUser(session.user.id).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) await loadAppUser(session.user.id)
        else setAppUser(null)
        setIsLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
    })
  }, [supabase])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setAppUser(null)
  }, [supabase])

  const refreshAppUser = useCallback(async () => {
    if (user) await loadAppUser(user.id)
  }, [user, loadAppUser])

  return (
    <AuthContext.Provider value={{
      user, session, appUser,
      permissions: appUser ? getPermissions(appUser) : null,
      isLoading, signInWithGoogle, signOut, refreshAppUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

### src/app/auth/callback/route.ts

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

---

## 12. Middleware — Route & Role Protection

### src/middleware.ts

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED     = ['/dashboard','/tracker','/registry','/orders','/payroll','/admin']
const ADMIN_ONLY    = ['/admin']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (!user && PROTECTED.some(p => pathname.startsWith(p))) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && ADMIN_ONLY.some(p => pathname.startsWith(p))) {
    const { data: appUser } = await supabase
      .from('app_users').select('role').eq('id', user.id).single()
    if (!appUser || appUser.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard?error=access_denied', request.url))
    }
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

## 13. Data Layer — lib/db.ts

All database operations in one file. Components never call Supabase directly.

```typescript
import { createClient } from '@/lib/supabase/client'
import type {
  AppUser, WorkerTrackerRow, WorkerRegistryRow,
  OrderRow, PayrollRow, Platform, PlatformTaskColumn,
  PlatformStatsRow, TaskStatusHistoryRow,
} from '@/types'

// ── Platforms ───────────────────────────────────────────────────

export async function fetchPlatforms(): Promise<Platform[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('platforms').select('*').eq('is_active', true).order('id')
  if (error) { console.error('fetchPlatforms:', error.message); return [] }
  return data
}

export async function fetchPlatformTaskColumns(platformSlug: string): Promise<PlatformTaskColumn[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('platform_task_columns')
    .select('*, platforms!inner(slug)')
    .eq('platforms.slug', platformSlug)
    .eq('is_active', true)
    .order('sort_order')
  if (error) { console.error('fetchPlatformTaskColumns:', error.message); return [] }
  return data
}

export async function fetchPlatformStats(): Promise<PlatformStatsRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('platform_stats').select('*').order('total_workers', { ascending: false })
  if (error) { console.error('fetchPlatformStats:', error.message); return [] }
  return data
}

// ── Worker tracker ──────────────────────────────────────────────

export async function fetchTrackerByPlatform(
  platformSlug: string,
  filters?: { warningLevel?: string; linker?: string; search?: string }
): Promise<WorkerTrackerRow[]> {
  const supabase = createClient()
  let query = supabase
    .from('worker_tracker')
    .select('*, platforms!inner(slug)')
    .eq('platforms.slug', platformSlug)
    .order('created_at')

  if (filters?.warningLevel) query = query.eq('warning_level', filters.warningLevel)
  if (filters?.linker)       query = query.eq('linker', filters.linker)
  if (filters?.search) {
    query = query.or(
      `worker_name.ilike.%${filters.search}%,owner_name.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query
  if (error) { console.error('fetchTrackerByPlatform:', error.message); return [] }
  return data as WorkerTrackerRow[]
}

export async function updateTrackerField(
  rowId: string, field: string, value: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('worker_tracker').update({ [field]: value }).eq('id', rowId)
  return { error: error?.message ?? null }
}

export async function updateTaskStatus(
  rowId: string, columnKey: string, newStatus: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { data: row, error: readErr } = await supabase
    .from('worker_tracker').select('task_statuses').eq('id', rowId).single()
  if (readErr) return { error: readErr.message }

  const merged = { ...(row.task_statuses ?? {}), [columnKey]: newStatus }
  const { error } = await supabase
    .from('worker_tracker').update({ task_statuses: merged }).eq('id', rowId)
  return { error: error?.message ?? null }
}

export async function insertTrackerRow(
  row: Omit<WorkerTrackerRow, 'id' | 'created_at' | 'updated_at'>
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('worker_tracker').insert(row).select('id').single()
  return { id: data?.id ?? null, error: error?.message ?? null }
}

export async function deleteTrackerRow(rowId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('worker_tracker').delete().eq('id', rowId)
  return { error: error?.message ?? null }
}

export async function fetchTaskHistory(rowId: string): Promise<TaskStatusHistoryRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('task_status_history')
    .select('*').eq('tracker_row_id', rowId)
    .order('changed_at', { ascending: false }).limit(50)
  if (error) { console.error('fetchTaskHistory:', error.message); return [] }
  return data
}

// ── Workers registry ────────────────────────────────────────────

export async function fetchRegistryByPlatform(platformSlug: string): Promise<WorkerRegistryRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('workers_registry')
    .select('*, platforms!inner(slug)')
    .eq('platforms.slug', platformSlug)
    .order('date_started', { ascending: false })
  if (error) { console.error('fetchRegistryByPlatform:', error.message); return [] }
  return data as WorkerRegistryRow[]
}

export async function insertRegistryRow(
  row: Omit<WorkerRegistryRow, 'id' | 'created_at' | 'updated_at'>
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('workers_registry').insert(row).select('id').single()
  return { id: data?.id ?? null, error: error?.message ?? null }
}

export async function updateRegistryRow(
  rowId: string, updates: Partial<WorkerRegistryRow>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('workers_registry').update(updates).eq('id', rowId)
  return { error: error?.message ?? null }
}

// ── Orders ──────────────────────────────────────────────────────

export async function fetchOrdersByPlatform(
  platformSlug: string, statusFilter?: string
): Promise<OrderRow[]> {
  const supabase = createClient()
  let query = supabase
    .from('orders')
    .select('*, platforms!inner(slug)')
    .eq('platforms.slug', platformSlug)
    .order('order_date', { ascending: false })
  if (statusFilter) query = query.eq('status', statusFilter)
  const { data, error } = await query
  if (error) { console.error('fetchOrdersByPlatform:', error.message); return [] }
  return data as OrderRow[]
}

export async function createOrder(
  order: Omit<OrderRow, 'id' | 'created_at' | 'updated_at'>
): Promise<{ order: OrderRow | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders').insert(order).select().single()
  return { order: data as OrderRow | null, error: error?.message ?? null }
}

export async function updateOrder(
  orderId: string,
  updates: Partial<Pick<OrderRow, 'status' | 'proxy' | 'owner_name' | 'order_date' | 'notes'>>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('orders').update(updates).eq('id', orderId)
  return { error: error?.message ?? null }
}

export async function deleteOrder(orderId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('orders').delete().eq('id', orderId)
  return { error: error?.message ?? null }
}

// ── Payroll ─────────────────────────────────────────────────────

export async function fetchPayrollByPlatform(
  platformSlug: string, year?: number, month?: string
): Promise<PayrollRow[]> {
  const supabase = createClient()
  let query = supabase
    .from('payroll')
    .select('*, platforms!inner(slug)')
    .eq('platforms.slug', platformSlug)
    .order('year', { ascending: false })
  if (year)  query = query.eq('year', year)
  if (month) query = query.eq('month', month)
  const { data, error } = await query
  if (error) { console.error('fetchPayrollByPlatform:', error.message); return [] }
  return data as PayrollRow[]
}

export async function upsertPayrollRow(
  row: Omit<PayrollRow, 'id' | 'created_at'>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('payroll').upsert(row, {
    onConflict: 'platform_id,account_code,worker_name,month,year',
  })
  return { error: error?.message ?? null }
}

// ── Admin — user management ─────────────────────────────────────

export async function fetchAllUsers(): Promise<AppUser[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('app_users').select('*').order('created_at')
  if (error) { console.error('fetchAllUsers:', error.message); return [] }
  return data as AppUser[]
}
```

---

## 14. Next.js API Routes

### src/app/api/admin/users/route.ts

```typescript
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function assertAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('app_users').select('role').eq('id', user.id).single()
  return data?.role === 'admin' ? user : null
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const admin = await assertAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const { data, error } = await createAdminClient()
    .from('app_users').select('*').order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const adminUser = await assertAdmin(supabase)
  if (!adminUser) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const { userId, role, platform_access, can_view_orders, worker_id } = await request.json()

  if (userId === adminUser.id && role !== 'admin') {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  const updates = {
    role,
    platform_access:  role === 'admin' ? null : (platform_access ?? []),
    can_view_orders:  role === 'admin' ? true : (can_view_orders ?? false),
    ...(worker_id !== undefined ? { worker_id } : {}),
  }

  const { error } = await createAdminClient()
    .from('app_users').update(updates).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

### src/app/api/export/[table]/route.ts

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { table: string } }
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { data: appUser } = await supabase
    .from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || !['admin','manager'].includes(appUser.role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform')
  const { table } = params

  const ALLOWED = ['worker_tracker','workers_registry','payroll']
  if (!ALLOWED.includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }

  let query = supabase.from(table as any).select('*') as any
  if (platform) {
    query = supabase
      .from(table as any)
      .select('*, platforms!inner(slug)')
      .eq('platforms.slug', platform)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) {
    return new NextResponse('', {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${table}.csv"`,
      },
    })
  }

  const headers = Object.keys(data[0]).filter(k => k !== 'platforms')
  const csvRows = [
    headers.join(','),
    ...data.map((row: any) =>
      headers.map(h => {
        const val = row[h]
        if (val == null) return ''
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g,'""')}"`
        return `"${String(val).replace(/"/g,'""')}"`
      }).join(',')
    ),
  ]

  return new NextResponse(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${table}_${platform ?? 'all'}.csv"`,
    },
  })
}
```

### src/app/api/tracker/task/route.ts

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { rowId, columnKey, newStatus } = await request.json()
  if (!rowId || !columnKey || !newStatus) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data: row, error: readErr } = await supabase
    .from('worker_tracker').select('task_statuses').eq('id', rowId).single()
  if (readErr || !row) {
    return NextResponse.json({ error: readErr?.message ?? 'Not found' }, { status: 404 })
  }

  const merged = { ...(row.task_statuses ?? {}), [columnKey]: newStatus }
  const { error } = await supabase
    .from('worker_tracker').update({ task_statuses: merged }).eq('id', rowId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

---

## 15. Seeding from Excel Files

```bash
npm install -D xlsx tsx dotenv
mkdir -p data
cp /path/to/AI_JobBoard_Worker_Tracker.xlsx data/
cp /path/to/AI_Platform_Workers_Hub.xlsx    data/
```

### scripts/seed.ts

```typescript
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const YN_VALID = ['✅ Yes','❌ No','⏳ Pending','🔄 In Progress','➖ N/A']
const W_VALID  = ['🟢 Clear','🟡 Minor','🔴 Serious','⚫ Banned','➖ None']
const O_VALID  = ['🟢 Active','🟡 Pending','🔵 Processing','🔴 Issue','⚫ Cancelled','✅ Completed']
const G_VALID  = ['✅ Passed','❌ Failed','⏳ Pending','🔄 Retake','⭕ Exempted']
const A_VALID  = ['Full-Time','Part-Time','Contractor','Intern','Freelance']
const M_VALID  = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December']
const L_VALID  = ['Linker A','Linker B','Linker C','Linker D','Self']

const norm   = (v: unknown, allowed: string[], fallback: string) => {
  const s = String(v ?? '').trim()
  return allowed.includes(s) ? s : fallback
}
const cell   = (row: unknown[], idx: number) => String(row[idx] ?? '').trim()
const header = (headers: string[], name: string) => headers.indexOf(name)

async function getPlatformMap() {
  const { data } = await supabase.from('platforms').select('id, slug')
  return Object.fromEntries((data ?? []).map(p => [p.slug, p.id]))
}

async function seedTracker(platformMap: Record<string, number>) {
  const wb = XLSX.readFile('./data/AI_JobBoard_Worker_Tracker.xlsx')
  const sheetMap: Record<string, string> = {
    '🟣 Oneforma':'oneforma','🔵 Telus':'telus',
    '🟢 Data Annotation':'data_annotation','🟠 Outlier':'outlier',
    '🩷 Mercor AI':'mercor_ai','🟡 Remotasks':'remotasks',
    '🔷 Appen':'appen','🔶 Clickworker':'clickworker','⚫ Scale AI':'scale_ai',
  }

  for (const [sheetName, slug] of Object.entries(sheetMap)) {
    const ws = wb.Sheets[sheetName]
    if (!ws) { console.log(`  ⚠ Missing sheet: ${sheetName}`); continue }

    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    const hi = rows.findIndex(r => String((r as unknown[])[0]).trim() === '#')
    if (hi < 0) { console.log(`  ⚠ No header in: ${sheetName}`); continue }

    const headers = (rows[hi] as unknown[]).map(h => String(h).trim())
    const data    = rows.slice(hi + 1).filter(r => cell(r as unknown[], 0) !== '')
    const pid     = platformMap[slug]
    if (!pid) continue

    const leIdx    = headers.indexOf('📜 LE CERT.')
    const taskStart = leIdx >= 0 ? leIdx + 1 : headers.length
    const taskKeys  = headers.slice(taskStart).filter(Boolean)

    const records = data.map(row => {
      const r = row as unknown[]
      const taskStatuses: Record<string,string> = {}
      taskKeys.forEach((k, i) => {
        if (k) taskStatuses[k] = norm(r[taskStart + i], YN_VALID, '➖ N/A')
      })
      return {
        platform_id:      pid,
        owner_name:       cell(r, header(headers,'👤 NAME'))        || 'Unknown',
        linker:           norm(cell(r, header(headers,'🔗 LINKER')), L_VALID, 'Self'),
        worker_name:      cell(r, header(headers,'👷 WORKERS NAME')) || 'Unknown',
        email:            cell(r, header(headers,'📧 EMAIL ADDRESS')) || null,
        apple_connect_pw: cell(r, header(headers,'🍎 APPLE CONNECT PW')) || null,
        platform_id_code: cell(r, header(headers,'🆔 PLATFORM ID')) || null,
        payoneer_linked:  norm(cell(r, header(headers,'💳 PAYONEER LINKED')), YN_VALID, '⏳ Pending'),
        warning_level:    norm(cell(r, header(headers,'⚠️ WARNING')),          W_VALID, '➖ None'),
        sow_done:         norm(cell(r, header(headers,'📄 SOW')),               YN_VALID, '⏳ Pending'),
        le_cert:          norm(cell(r, header(headers,'📜 LE CERT.')),          YN_VALID, '➖ N/A'),
        task_statuses:    taskStatuses,
      }
    })

    for (let i = 0; i < records.length; i += 50) {
      const { error } = await supabase.from('worker_tracker').insert(records.slice(i, i+50))
      if (error) console.error(`  ✗ ${sheetName} batch ${Math.floor(i/50)+1}:`, error.message)
    }
    console.log(`  ✓ Tracker ${sheetName}: ${records.length} rows`)
  }
}

async function seedHub(platformMap: Record<string, number>) {
  const wb = XLSX.readFile('./data/AI_Platform_Workers_Hub.xlsx')
  const platforms = [
    ['🟣 Oneforma','oneforma'],['🔵 Telus','telus'],
    ['🟢 Data Annotation','data_annotation'],
    ['🟠 Outlier','outlier'],['🩷 Mercor AI','mercor_ai'],
  ]

  for (const [baseName, slug] of platforms) {
    const pid = platformMap[slug]
    if (!pid) continue

    // Workers registry
    const wWs = wb.Sheets[baseName]
    if (wWs) {
      const rows: unknown[][] = XLSX.utils.sheet_to_json(wWs, { header: 1, defval: '' })
      const hi = rows.findIndex(r => String((r as unknown[])[0]).trim() === '#')
      if (hi >= 0) {
        const headers = (rows[hi] as unknown[]).map(h => String(h).trim())
        const data = rows.slice(hi+1).filter(r => cell(r as unknown[], 0) !== '')
        const records = data.map(row => {
          const r = row as unknown[]
          return {
            platform_id:  pid,
            project_task: cell(r, header(headers,'📋 Project Task')) || 'N/A',
            owner_name:   cell(r, header(headers,'👤 Owner'))         || 'Unknown',
            account_type: norm(cell(r, header(headers,'🏷 Account Type')), A_VALID, 'Freelance'),
            email:        cell(r, header(headers,'📧 Email'))   || null,
            passport:     cell(r, header(headers,'🛂 Passport')) || null,
            geowork_test: norm(cell(r, header(headers,'🌍 Geowork Test')), G_VALID, '⏳ Pending'),
            date_started: null,
          }
        })
        const { error } = await supabase.from('workers_registry').insert(records)
        if (error) console.error(`  ✗ Registry ${baseName}:`, error.message)
        else console.log(`  ✓ Registry ${baseName}: ${records.length} rows`)
      }
    }

    // Orders
    const oWs = wb.Sheets[`${baseName} Orders`]
    if (oWs) {
      const rows: unknown[][] = XLSX.utils.sheet_to_json(oWs, { header: 1, defval: '' })
      const hi = rows.findIndex(r => String((r as unknown[])[0]).trim().includes('Order ID'))
      if (hi >= 0) {
        const headers = (rows[hi] as unknown[]).map(h => String(h).trim())
        const data = rows.slice(hi+1).filter(r => cell(r as unknown[], 0) !== '')
        const records = data.map(row => {
          const r = row as unknown[]
          return {
            platform_id:   pid,
            order_id_code: cell(r, 0),
            proxy:         cell(r, header(headers,'🌐 Proxy'))  || null,
            owner_name:    cell(r, header(headers,'👤 Owner'))  || 'Unknown',
            status:        norm(cell(r, header(headers,'🚦 Status')), O_VALID, '🟡 Pending'),
            order_date:    null,
            notes:         cell(r, header(headers,'💬 Notes')) || null,
          }
        })
        const { error } = await supabase.from('orders').insert(records)
        if (error) console.error(`  ✗ Orders ${baseName}:`, error.message)
        else console.log(`  ✓ Orders ${baseName}: ${records.length} rows`)
      }
    }

    // Payroll
    const pWs = wb.Sheets[`${baseName} Payroll`]
    if (pWs) {
      const rows: unknown[][] = XLSX.utils.sheet_to_json(pWs, { header: 1, defval: '' })
      const hi = rows.findIndex(r => String((r as unknown[])[0]).trim() === '#')
      if (hi >= 0) {
        const headers = (rows[hi] as unknown[]).map(h => String(h).trim())
        const data = rows.slice(hi+1).filter(r => cell(r as unknown[], 0) !== '')
        const records = data.map(row => {
          const r = row as unknown[]
          return {
            platform_id:  pid,
            account_code: cell(r, header(headers,'🏦 Account')) || 'ACC-000',
            worker_name:  cell(r, header(headers,'👷 Worker'))  || 'Unknown',
            month:        norm(cell(r, header(headers,'📆 Month')), M_VALID, 'January'),
            year:         2025,
            tasks_done:   parseInt(cell(r, header(headers,'✅ Tasks Done'))) || 0,
            pay_usd:      parseFloat(cell(r, header(headers,'💵 Pay ($)'))) || 0,
            notes:        cell(r, header(headers,'💬 Notes')) || null,
          }
        })
        const { error } = await supabase.from('payroll').insert(records)
        if (error) console.error(`  ✗ Payroll ${baseName}:`, error.message)
        else console.log(`  ✓ Payroll ${baseName}: ${records.length} rows`)
      }
    }
  }
}

async function main() {
  console.log('\n🌱 Hexagon LABS seed starting...\n')
  const pm = await getPlatformMap()
  console.log('📌 Seeding Job Board Tracker...')
  await seedTracker(pm)
  console.log('\n📌 Seeding Workers Hub...')
  await seedHub(pm)
  console.log('\n✅ Seed complete.\n')
}

main().catch(console.error)
```

Run the seed:

```bash
npx tsx scripts/seed.ts
```

---

## 16. Real-time Subscriptions

Use in the tracker and orders pages to get instant updates when another admin edits data.

```typescript
// Inside your tracker page component — useEffect hook
useEffect(() => {
  const supabase = createClient()
  const channel = supabase
    .channel(`tracker-${platformSlug}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'worker_tracker',
        filter: `platform_id=eq.${platformId}` },
      (payload) => {
        if (payload.eventType === 'UPDATE') {
          setRows(prev => prev.map(r =>
            r.id === payload.new.id
              ? { ...r, ...(payload.new as WorkerTrackerRow) }
              : r
          ))
        } else if (payload.eventType === 'INSERT') {
          setRows(prev => [...prev, payload.new as WorkerTrackerRow])
        } else if (payload.eventType === 'DELETE') {
          setRows(prev => prev.filter(r => r.id !== (payload.old as any).id))
        }
      }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [platformSlug, platformId])
```

Real-time is already enabled for both tables via the `ALTER PUBLICATION` statement in Block 9 of the schema.

---

## 17. Step-by-Step Backend Build Guide

```
Step 1   Create Supabase project
         supabase.com → New project → name: ai-workers-hub
         Save the database password securely

Step 2   Enable Google OAuth
         Authentication → Providers → Google → Enable
         Create OAuth 2.0 credentials in Google Cloud Console
         Add both redirect URIs (Supabase callback + localhost)
         Paste Client ID + Secret into Supabase → Save

Step 3   Collect credentials
         Settings → API → copy Project URL, anon key, service_role key
         Add all three to .env.local

Step 4   Install Supabase CLI and link project
         npm install -g supabase
         supabase login
         supabase link --project-ref <your-ref>

Step 5   Run schema in SQL Editor (Section 7)
         Block 1: Extensions
         Block 2: platforms + seed 9 platforms
         Block 3: app_users
         Block 4: platform_task_columns + seed all 9 platforms' columns
         Block 5: worker_tracker
         Block 6: task_status_history
         Block 7: workers_registry
         Block 8: orders
         Block 9: payroll
         Block 10: views (warning_summary, order_summary, platform_stats)
         Verify: Table Editor should show all tables populated

Step 6   Run RLS policies (Section 8)
         Run the entire RLS block as one query
         Verify: Authentication → Policies
         Should see policies on all 8 tables

Step 7   Run DB functions & triggers (Section 9)
         Run the entire functions block as one query
         Verify: Database → Functions (should see 7 functions)
         Verify: Database → Triggers (should see triggers on 5 tables)
         IMPORTANT: update the ALTER DATABASE statements with
         your actual supabase_url and service_role_key values

Step 8   Generate TypeScript types
         supabase gen types typescript \
           --project-id <ref> > src/types/database.ts
         Commit this file — regenerate any time schema changes

Step 9   Create TypeScript types (Section 5)
         src/types/index.ts — all interfaces + getPermissions()

Step 10  Create Supabase client files (Section 6)
         src/lib/supabase/client.ts
         src/lib/supabase/server.ts

Step 11  Create AuthContext (Section 11)
         src/contexts/AuthContext.tsx
         src/app/auth/callback/route.ts

Step 12  Create middleware (Section 12)
         src/middleware.ts
         Test: curl http://localhost:3000/dashboard
         Should redirect to /login

Step 13  Create data layer (Section 13)
         src/lib/db.ts
         All functions return typed data or empty arrays on error

Step 14  Create API routes (Section 14)
         src/app/api/admin/users/route.ts
         src/app/api/export/[table]/route.ts
         src/app/api/tracker/task/route.ts

Step 15  Test APIs with curl
         # Grade route
         curl -X GET http://localhost:3000/api/admin/users
         # Should return 401 (not logged in)

         # After logging in as admin:
         curl -X PATCH http://localhost:3000/api/admin/users \
           -H "Content-Type: application/json" \
           -d '{"userId":"...","role":"manager","platform_access":["oneforma"]}'

Step 16  Set up Edge Functions (Section 10)
         supabase functions new notify-warning
         supabase functions new daily-summary
         Paste function code from Section 10
         supabase functions deploy notify-warning
         supabase functions deploy daily-summary
         supabase secrets set SLACK_WEBHOOK_URL=... NOTIFICATION_EMAIL=...

Step 17  Run seed script (Section 15)
         npm install -D xlsx tsx dotenv
         mkdir -p data
         Copy Excel files to data/
         npx tsx scripts/seed.ts
         Verify rows in Supabase Table Editor

Step 18  Promote yourself to admin
         In Supabase SQL Editor run:
         UPDATE public.app_users
           SET role = 'admin',
               platform_access = null,
               can_view_orders = true
           WHERE email = 'your.email@gmail.com';

Step 19  Verify the trigger chain
         In browser console while logged in as admin:
         1. Update a worker's warning_level to '🔴 Serious'
         2. Check task_status_history table — should have a new row
         3. Check Slack/email — Edge Function should have fired

Step 20  End-to-end verification
         Sign in → app_users row created with role='worker'
         Promote yourself via SQL
         Sign back in → role shows 'admin' in sidebar
         Navigate to /admin/users → see user list
         Grant a test user manager role + oneforma access
         Sign in as test user → verify they only see oneforma data
         Create an order → verify only admin can edit it
         Export a CSV → verify download works
         Update a task status → verify real-time update fires
```

---

## 18. Deployment Checklist

### Vercel

```bash
git add . && git commit -m "feat: workershub initial build" && git push
```

1. Vercel.com → New Project → Import from GitHub
2. Settings → Environment Variables → add all 6:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` = `https://your-app.vercel.app`
   - `SLACK_WEBHOOK_URL` (if using notifications)
   - `NOTIFICATION_EMAIL` (if using notifications)
3. Supabase → Authentication → URL Configuration → Redirect URLs → add:
   ```
   https://your-app.vercel.app/auth/callback
   ```
4. Google Cloud → OAuth credentials → Authorised redirect URIs → add:
   ```
   https://your-app.vercel.app/auth/callback
   ```
5. Update the two `ALTER DATABASE` statements in Step 7 with production values
6. Deploy → sign in → run admin SQL promotion → verify all pages

### Netlify

Add `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Same env vars and redirect URI setup as Vercel.

---

## 19. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| app_users row not created after sign-in | on_auth_user_created trigger missing | Re-run Section 9 — check Database → Triggers |
| Orders return empty for admin | role column is still 'worker' | Run the admin SQL promotion in Step 18 |
| get_my_role() returns null | User missing from app_users | Trigger didn't fire — insert row manually in Table Editor |
| Manager sees all platforms | platform_access is null (admin perk) | Set platform_access = '{oneforma,telus}' (not null) via API route |
| Worker can see all rows | worker_id not linked | Set worker_id in app_users to the correct worker_tracker.id |
| Task history not recording | worker_tracker_history trigger missing | Re-run the trigger block in Section 9 |
| Edge Function not firing | pg_net or ALTER DATABASE not set | Test pg_net: SELECT net.http_post(url:='https://httpbin.org/post', body:='{}') |
| Seed fails with check constraint violation | Invalid status string from Excel | Add console.log before inserts to see which value fails; fix the norm() call |
| Auth callback loop | Redirect URI mismatch | Ensure exact URL (no trailing slash) in both Google Cloud and Supabase |
| Real-time updates not firing | Table not in supabase_realtime publication | ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_tracker |
| SUPABASE_SERVICE_ROLE_KEY undefined | Using NEXT_PUBLIC_ prefix | Remove NEXT_PUBLIC_ — service role key is server-only |
| TypeScript errors on DB queries | Types out of sync | Re-run: supabase gen types typescript --project-id <ref> > src/types/database.ts |
| pg_net extension not found | Not enabled | CREATE EXTENSION IF NOT EXISTS pg_net; in SQL Editor |
| Daily summary cron not running | pg_cron not installed | CREATE EXTENSION IF NOT EXISTS pg_cron; in SQL Editor |

---

*Hexagon LABS Backend PRD v1.0*
*Full Supabase implementation: PostgreSQL schema · RLS policies · 8 DB functions & triggers · 2 Edge Functions · Auth · 3 API routes · Excel seed script · Real-time subscriptions*

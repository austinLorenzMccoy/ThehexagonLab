-- ═══════════════════════════════════════════════════════════════════
-- PART 1: Extensions + Tables + Seed Data + Indexes
-- Paste this into Supabase SQL Editor and click "Run"
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Extensions ──────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";
create extension if not exists "pg_net";

-- ── 2. Platforms ──────────────────────────────────────────────────
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

-- ── 3. App users ──────────────────────────────────────────────────
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

-- ── 4. Platform task columns ─────────────────────────────────────
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

-- ── 5. Worker tracker ──────────────────────────────────────────────
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

-- ── 6. Task status history (audit log) ───────────────────────────
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

-- ── 7. Workers registry ──────────────────────────────────────────
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

-- ── 8. Orders (Admin-only write by default) ───────────────────────
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

-- ── 9. Payroll ───────────────────────────────────────────────────
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

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

-- ── 10. Dashboard views ──────────────────────────────────────────
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

-- ── 11. Row Level Security Enablement ─────────────────────────────
alter table public.app_users             enable row level security;
alter table public.platforms             enable row level security;
alter table public.platform_task_columns enable row level security;
alter table public.worker_tracker        enable row level security;
alter table public.task_status_history   enable row level security;
alter table public.workers_registry      enable row level security;
alter table public.orders                enable row level security;
alter table public.payroll               enable row level security;

-- ── 12. RLS helper functions ──────────────────────────────────────
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

-- ── 13. RLS Policies ──────────────────────────────────────────────

-- platforms
create policy "platforms_select" on public.platforms for select
  using (auth.uid() is not null);

-- platform_task_columns
create policy "task_columns_select" on public.platform_task_columns for select
  using (auth.uid() is not null);

-- app_users
create policy "app_users_select" on public.app_users for select
  using (auth.uid() = id or public.get_my_role() = 'admin');

create policy "app_users_insert" on public.app_users for insert
  with check (auth.uid() = id or public.get_my_role() = 'admin');

create policy "app_users_update" on public.app_users for update
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "app_users_delete" on public.app_users for delete
  using (public.get_my_role() = 'admin');

-- worker_tracker
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

-- task_status_history
create policy "history_select" on public.task_status_history for select
  using (public.get_my_role() in ('admin','manager') or changed_by = auth.uid());

create policy "history_insert" on public.task_status_history for insert
  with check (public.get_my_role() in ('admin','manager','supervisor'));

-- workers_registry
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

-- orders
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

-- payroll
create policy "payroll_select" on public.payroll for select
  using (public.get_my_role() in ('admin','manager'));

create policy "payroll_insert" on public.payroll for insert
  with check (public.get_my_role() in ('admin','manager'));

create policy "payroll_update" on public.payroll for update
  using (public.get_my_role() in ('admin','manager'));

create policy "payroll_delete" on public.payroll for delete
  using (public.get_my_role() = 'admin');


-- ── 14. Functions & Triggers ──────────────────────────────────────

-- 1. Auto-update updated_at
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

-- 2. Auto-create app_users row on first sign-in
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

-- 3. Log every status change to task_status_history
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

-- 4. Notify Edge Function when warning escalates to Serious/Banned
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

-- 5. Validate JSONB task_statuses values on insert/update
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

-- 6. Schedule daily summary cron job
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

-- ── 15. Set DB-level settings placeholder ─────────────────────────
-- Note: Replace these using actual values during local/production deployment
alter database postgres
  set app.supabase_url = 'http://kong:54321';

alter database postgres
  set app.service_role_key = 'eyJ...';

-- ── 16. Enable real-time for tracker and orders tables ────────────
alter publication supabase_realtime add table public.worker_tracker;
alter publication supabase_realtime add table public.orders;

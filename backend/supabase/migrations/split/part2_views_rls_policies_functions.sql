-- ═══════════════════════════════════════════════════════════════════
-- PART 2: Views + RLS + Policies + Functions + Triggers
-- Run this AFTER Part 1 succeeds
-- ═══════════════════════════════════════════════════════════════════

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

-- Platform Admin — admin write access + helpers (standalone apply)
-- Mirrors split/part8_platform_admin.sql

drop policy if exists "platforms_insert_admin" on public.platforms;
create policy "platforms_insert_admin" on public.platforms
  for insert
  with check (public.get_my_role() = 'admin');

drop policy if exists "platforms_update_admin" on public.platforms;
create policy "platforms_update_admin" on public.platforms
  for update
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

drop policy if exists "platforms_delete_admin" on public.platforms;
create policy "platforms_delete_admin" on public.platforms
  for delete
  using (public.get_my_role() = 'admin');

drop policy if exists "task_columns_insert_admin" on public.platform_task_columns;
create policy "task_columns_insert_admin" on public.platform_task_columns
  for insert
  with check (public.get_my_role() = 'admin');

drop policy if exists "task_columns_update_admin" on public.platform_task_columns;
create policy "task_columns_update_admin" on public.platform_task_columns
  for update
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

drop policy if exists "task_columns_delete_admin" on public.platform_task_columns;
create policy "task_columns_delete_admin" on public.platform_task_columns
  for delete
  using (public.get_my_role() = 'admin');

create or replace function public.platform_usage(p_id smallint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tracker int := 0;
  v_registry int := 0;
  v_orders int := 0;
  v_payroll int := 0;
  v_onboarding int := 0;
  v_columns int := 0;
  v_active_columns int := 0;
begin
  select count(*)::int into v_tracker from public.worker_tracker where platform_id = p_id;
  select count(*)::int into v_registry from public.workers_registry where platform_id = p_id;
  select count(*)::int into v_orders from public.orders where platform_id = p_id;
  select count(*)::int into v_payroll from public.payroll where platform_id = p_id;
  select count(*)::int into v_columns from public.platform_task_columns where platform_id = p_id;
  select count(*)::int into v_active_columns
    from public.platform_task_columns where platform_id = p_id and is_active;

  if to_regclass('public.onboarding') is not null then
    execute 'select count(*)::int from public.onboarding where platform_id = $1'
      into v_onboarding
      using p_id;
  end if;

  return jsonb_build_object(
    'tracker', v_tracker,
    'registry', v_registry,
    'orders', v_orders,
    'payroll', v_payroll,
    'onboarding', v_onboarding,
    'columns', v_columns,
    'active_columns', v_active_columns
  );
end;
$$;

create or replace function public.platform_has_data(p_id smallint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      (public.platform_usage(p_id)->>'tracker')::int
      + (public.platform_usage(p_id)->>'registry')::int
      + (public.platform_usage(p_id)->>'orders')::int
      + (public.platform_usage(p_id)->>'payroll')::int
      + (public.platform_usage(p_id)->>'onboarding')::int
    ) > 0,
    false
  );
$$;

create or replace function public.clone_platform_task_columns(
  source_id smallint,
  target_id smallint,
  only_active boolean default true
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted int := 0;
begin
  if public.get_my_role() is distinct from 'admin' then
    raise exception 'Only admins can clone platform task columns';
  end if;

  if source_id is null or target_id is null then
    raise exception 'source_id and target_id are required';
  end if;

  if source_id = target_id then
    raise exception 'source and target must differ';
  end if;

  if not exists (select 1 from public.platforms where id = source_id) then
    raise exception 'Source platform % not found', source_id;
  end if;

  if not exists (select 1 from public.platforms where id = target_id) then
    raise exception 'Target platform % not found', target_id;
  end if;

  insert into public.platform_task_columns (platform_id, column_key, column_label, sort_order, is_active)
  select
    target_id,
    s.column_key,
    s.column_label,
    s.sort_order,
    true
  from public.platform_task_columns s
  where s.platform_id = source_id
    and (not only_active or s.is_active)
    and not exists (
      select 1 from public.platform_task_columns t
      where t.platform_id = target_id and t.column_key = s.column_key
    );

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

grant execute on function public.platform_has_data(smallint) to authenticated;
grant execute on function public.platform_usage(smallint) to authenticated;
grant execute on function public.clone_platform_task_columns(smallint, smallint, boolean) to authenticated;

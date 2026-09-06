-- ═══════════════════════════════════════════════════════════════════
-- PART 19: Projects — managed list scoped per platform
--
-- Platforms previously only had a free-text "project_task" column on
-- workers_registry. Admins now get a real, per-platform managed list
-- of projects (create/edit/deactivate/delete), mirroring the existing
-- platform_task_columns pattern, with a status field for tracking
-- review state (Passed / Under Review / Failed / Pending).
-- ═══════════════════════════════════════════════════════════════════

create table public.projects (
  id          smallserial primary key,
  platform_id smallint not null references public.platforms(id) on delete cascade,
  name        text not null,
  status      text not null default '⏳ Pending'
              check (status in ('✅ Passed','🔍 Under Review','❌ Failed','⏳ Pending')),
  sort_order  smallint not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique(platform_id, name)
);

create index idx_projects_platform on public.projects(platform_id);

alter table public.projects enable row level security;

create policy "projects_select" on public.projects for select
  using (auth.uid() is not null);

create policy "projects_insert_admin" on public.projects
  for insert
  with check (public.get_my_role() = 'admin');

create policy "projects_update_admin" on public.projects
  for update
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "projects_delete_admin" on public.projects
  for delete
  using (public.get_my_role() = 'admin');

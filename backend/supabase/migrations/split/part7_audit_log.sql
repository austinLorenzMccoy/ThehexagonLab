-- ═══════════════════════════════════════════════════════════════════
-- Audit Log Table — tracks admin actions (role changes, deactivation, etc.)
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.audit_log (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id),
  action      text not null,
  entity_type text not null,          -- 'user', 'order', 'onboarding', etc.
  entity_id   text,                   -- ID of the affected entity
  details     jsonb default '{}'::jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);

create index idx_audit_user on public.audit_log(user_id);
create index idx_audit_action on public.audit_log(action);
create index idx_audit_created on public.audit_log(created_at desc);

alter table public.audit_log enable row level security;

create policy "Admin read audit log"
  on public.audit_log for select
  using ((select role from public.app_users where id = auth.uid()) = 'admin');

create policy "Any authed user can insert audit"
  on public.audit_log for insert
  with check (auth.uid() is not null);

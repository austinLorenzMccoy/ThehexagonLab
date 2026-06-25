-- ═══════════════════════════════════════════════════════════════════
-- Email Alert Trigger — Logs warnings for admin review
-- Paste this into Supabase SQL Editor and click "Run"
-- ═══════════════════════════════════════════════════════════════════

-- Table to store alert notifications
create table if not exists public.alert_notifications (
  id          uuid primary key default uuid_generate_v4(),
  alert_type  text not null check (alert_type in ('warning', 'banned', 'order_issue', 'system')),
  title       text not null,
  message     text not null,
  severity    text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  is_read     boolean not null default false,
  related_id  uuid,
  created_at  timestamptz not null default now()
);

create index idx_alerts_unread on public.alert_notifications(is_read) where is_read = false;
create index idx_alerts_created on public.alert_notifications(created_at desc);

alter table public.alert_notifications enable row level security;

create policy "Admin access alerts"
  on public.alert_notifications for all
  using ((select role from public.app_users where id = auth.uid()) = 'admin')
  with check ((select role from public.app_users where id = auth.uid()) = 'admin');

-- Trigger function: auto-create alert when warning level changes to Serious or Banned
create or replace function public.fn_warning_alert()
returns trigger language plpgsql security definer as $$
begin
  if new.warning_level in ('🔴 Serious', '⚫ Banned')
     and (old.warning_level is null or old.warning_level != new.warning_level) then
    insert into public.alert_notifications (alert_type, title, message, severity, related_id)
    values (
      case when new.warning_level = '⚫ Banned' then 'banned' else 'warning' end,
      case when new.warning_level = '⚫ Banned'
        then 'Worker Banned: ' || new.worker_name
        else 'Serious Warning: ' || new.worker_name
      end,
      'Worker ' || new.worker_name || ' (owner: ' || new.owner_name || ') has been flagged as ' || new.warning_level,
      case when new.warning_level = '⚫ Banned' then 'critical' else 'warning' end,
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger trg_warning_alert
  after update of warning_level on public.worker_tracker
  for each row execute function public.fn_warning_alert();

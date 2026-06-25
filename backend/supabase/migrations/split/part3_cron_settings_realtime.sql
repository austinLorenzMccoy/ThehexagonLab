-- ═══════════════════════════════════════════════════════════════════
-- PART 3: Config Table + Cron Job + Realtime
-- Run this AFTER Part 2 succeeds
--
-- ⚠️  IMPORTANT: Make sure pg_cron and pg_net extensions are enabled
--     in Supabase Dashboard → Database → Extensions BEFORE running
-- ═══════════════════════════════════════════════════════════════════

-- ── 15. App config table (replaces ALTER DATABASE SET) ─────────────
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);

-- Only admins can read config, nobody can modify via API
alter table public.app_config enable row level security;

create policy "app_config_select_admin" on public.app_config for select
  using (public.get_my_role() = 'admin');

-- Insert your actual values
insert into public.app_config (key, value) values
  ('supabase_url',      'https://zbaepbcqtzhzyfdovhnb.supabase.co'),
  ('service_role_key',  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiYWVwYmNxdHpoenlmZG92aG5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI3NDMyNiwiZXhwIjoyMDk2ODUwMzI2fQ.g24uqTaAL1SJZFG4UFERPIc5FBiEz7q5VA9QvTpHss0')
on conflict (key) do update set value = excluded.value;

-- ── Helper to read config (security definer so triggers can access) ──
create or replace function public.get_app_config(p_key text)
returns text language sql stable security definer set search_path = public as $$
  select value from public.app_config where key = p_key limit 1;
$$;

-- ── Update notify_warning_escalation to use config table ──────────
create or replace function public.notify_warning_escalation()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_url text;
  v_key text;
begin
  if new.warning_level in ('🔴 Serious','⚫ Banned')
     and (old.warning_level is null
          or old.warning_level not in ('🔴 Serious','⚫ Banned'))
  then
    v_url := public.get_app_config('supabase_url');
    v_key := public.get_app_config('service_role_key');

    perform net.http_post(
      url     := v_url || '/functions/v1/notify-warning',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_key
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

-- ── 6. Schedule daily summary cron job ────────────────────────────
select cron.schedule(
  'daily-platform-summary',
  '0 8 * * *',
  $$
    select net.http_post(
      url     := (select value from public.app_config where key = 'supabase_url') || '/functions/v1/daily-summary',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (select value from public.app_config where key = 'service_role_key'),
        'Content-Type',  'application/json'
      ),
      body := '{}'
    );
  $$
);

-- ── 16. Enable real-time for tracker and orders tables ────────────
alter publication supabase_realtime add table public.worker_tracker;
alter publication supabase_realtime add table public.orders;

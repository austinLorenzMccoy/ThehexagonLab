-- ═══════════════════════════════════════════════════════════════════
-- Onboarding table — tracks client/worker applications to platforms
-- Paste this into Supabase SQL Editor and click "Run"
-- ═══════════════════════════════════════════════════════════════════

-- ── 0. Ensure helper function exists ────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 1. Create table ─────────────────────────────────────────────
create table public.onboarding (
  id                  uuid primary key default uuid_generate_v4(),
  platform_id         smallint not null references public.platforms(id),
  applicant_name      text not null,
  email               text,
  password            text,
  phone               text,
  country             text,
  referral            text,
  application_status  text not null default '⏳ Pending'
                      check (application_status in (
                        '⏳ Pending', '✅ Accepted', '❌ Rejected',
                        '🔄 In Review', '⚫ Withdrawn'
                      )),
  date_applied        date not null default current_date,
  date_resolved       date,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── 2. Indexes ──────────────────────────────────────────────────
create index idx_onboarding_platform on public.onboarding(platform_id);
create index idx_onboarding_status   on public.onboarding(application_status);
create index idx_onboarding_date     on public.onboarding(date_applied desc);
create index idx_onboarding_referral on public.onboarding(referral);

-- ── 3. RLS policies (admin + manager only) ──────────────────────
alter table public.onboarding enable row level security;

create policy "Admin full access to onboarding"
  on public.onboarding for all
  using ((select role from public.app_users where id = auth.uid()) = 'admin')
  with check ((select role from public.app_users where id = auth.uid()) = 'admin');

create policy "Manager read access to onboarding"
  on public.onboarding for select
  using ((select role from public.app_users where id = auth.uid()) = 'manager');

-- ── 4. Updated_at trigger ───────────────────────────────────────
create trigger trg_onboarding_updated
  before update on public.onboarding
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- PART 13: Revenue split percentages (client / company / referral / worker)
--
-- Each hour/task's value is split 4 ways, summing to 100%: what the
-- client relationship represents, the company's margin, the
-- referrer's commission (if any), and the worker's take-home. Every
-- party's percentage is independently negotiated and confidential —
-- workers and referrers never see any percentage, only the resulting
-- dollar figures they already see today (pay slips, payments,
-- referral commission_usd). These three tables are therefore
-- admin-only at the RLS layer, not just hidden in the UI — a worker's
-- own row-select policies never touch these tables.
--
-- Resolution order per worker: worker-level override -> platform
-- default -> 0. Referral % additionally has a per-referral override,
-- since a referrer's negotiated cut can differ per referred worker.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.platform_revenue_splits (
  platform_id          smallint primary key references public.platforms(id) on delete cascade,
  client_percentage    numeric(5,2) check (client_percentage between 0 and 100),
  company_percentage   numeric(5,2) check (company_percentage between 0 and 100),
  referral_percentage  numeric(5,2) check (referral_percentage between 0 and 100),
  worker_percentage    numeric(5,2) check (worker_percentage between 0 and 100),
  updated_at           timestamptz not null default now()
);

drop trigger if exists trg_platform_revenue_splits_updated on public.platform_revenue_splits;
create trigger trg_platform_revenue_splits_updated
  before update on public.platform_revenue_splits
  for each row execute function public.set_updated_at();

alter table public.platform_revenue_splits enable row level security;

drop policy if exists "platform_revenue_splits_admin_only" on public.platform_revenue_splits;
create policy "platform_revenue_splits_admin_only" on public.platform_revenue_splits for all
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create table if not exists public.worker_revenue_overrides (
  worker_user_id       uuid primary key references public.app_users(id) on delete cascade,
  client_percentage    numeric(5,2) check (client_percentage between 0 and 100),
  company_percentage   numeric(5,2) check (company_percentage between 0 and 100),
  worker_percentage    numeric(5,2) check (worker_percentage between 0 and 100),
  updated_at           timestamptz not null default now()
);

drop trigger if exists trg_worker_revenue_overrides_updated on public.worker_revenue_overrides;
create trigger trg_worker_revenue_overrides_updated
  before update on public.worker_revenue_overrides
  for each row execute function public.set_updated_at();

alter table public.worker_revenue_overrides enable row level security;

drop policy if exists "worker_revenue_overrides_admin_only" on public.worker_revenue_overrides;
create policy "worker_revenue_overrides_admin_only" on public.worker_revenue_overrides for all
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create table if not exists public.referral_revenue_overrides (
  referral_id          uuid primary key references public.referrals(id) on delete cascade,
  referral_percentage  numeric(5,2) check (referral_percentage between 0 and 100),
  updated_at           timestamptz not null default now()
);

drop trigger if exists trg_referral_revenue_overrides_updated on public.referral_revenue_overrides;
create trigger trg_referral_revenue_overrides_updated
  before update on public.referral_revenue_overrides
  for each row execute function public.set_updated_at();

alter table public.referral_revenue_overrides enable row level security;

drop policy if exists "referral_revenue_overrides_admin_only" on public.referral_revenue_overrides;
create policy "referral_revenue_overrides_admin_only" on public.referral_revenue_overrides for all
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

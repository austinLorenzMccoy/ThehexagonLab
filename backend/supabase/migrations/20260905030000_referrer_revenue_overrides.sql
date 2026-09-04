-- ═══════════════════════════════════════════════════════════════════
-- PART 17: Referrer-level default commission %
--
-- referral_revenue_overrides is deliberately per-referral (a referrer
-- can have a different negotiated cut per referred worker). This adds
-- a referrer-level DEFAULT that sits between the platform default and
-- a per-referral override, for the common case of "this referrer's
-- standard rate" set once on their account (mirrors
-- worker_revenue_overrides). Resolution order for referral %:
-- per-referral override -> referrer default -> platform default -> 0.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.referrer_revenue_overrides (
  referrer_user_id     uuid primary key references public.app_users(id) on delete cascade,
  referral_percentage  numeric(5,2) check (referral_percentage between 0 and 100),
  updated_at           timestamptz not null default now()
);

drop trigger if exists trg_referrer_revenue_overrides_updated on public.referrer_revenue_overrides;
create trigger trg_referrer_revenue_overrides_updated
  before update on public.referrer_revenue_overrides
  for each row execute function public.set_updated_at();

alter table public.referrer_revenue_overrides enable row level security;

drop policy if exists "referrer_revenue_overrides_admin_only" on public.referrer_revenue_overrides;
create policy "referrer_revenue_overrides_admin_only" on public.referrer_revenue_overrides for all
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

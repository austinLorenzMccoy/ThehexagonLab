-- ═══════════════════════════════════════════════════════════════════
-- PART 9: Worker Recovery & Workforce Management Platform
--
-- Implements doc/Worker_Recovery_System_PRD.md as an ADDITIVE layer on
-- top of the existing Hexagon LABS schema (parts 1-7 / init.sql).
-- Nothing here drops or renames an existing table, column, policy, or
-- view — it only adds new columns (via
-- `add column if not exists`), a widened role check constraint, and
-- brand-new tables/views/functions. Existing Tracker / Registry /
-- Orders / Payroll / Onboarding / Admin flows are unaffected.
--
-- Adds:
--   - `referrer` role + `contract_status` / `referral_code` /
--     `hourly_rate_usd` on app_users
--   - worker_timesheets, pay_slips, payments, warning_events,
--     worker_feedback, disputes, referrals, payout_requests,
--     partner_contacts
--   - warning escalation -> auto contract termination at 5 warnings
--   - referrer payout gating (all referred workers must be paid)
--   - worker_earnings_summary / referral_summary views
--
-- Run in Supabase SQL Editor AFTER part1-part7 (or after the combined
-- 20260612000000_init.sql).
-- Safe to re-run: every statement is idempotent (if not exists / or
-- replace / drop-then-create policy).
-- ═══════════════════════════════════════════════════════════════════

-- ── 0. Shared helper (idempotent — may already exist from part4) ───
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 1. Extend app_users: referrer role + contract lifecycle ────────
alter table public.app_users drop constraint if exists app_users_role_check;
alter table public.app_users add constraint app_users_role_check
  check (role in ('admin','manager','supervisor','worker','referrer'));

alter table public.app_users
  add column if not exists contract_status text not null default 'active'
    check (contract_status in ('active','terminated')),
  add column if not exists referral_code text unique,
  add column if not exists hourly_rate_usd numeric(10,2),
  add column if not exists paystack_recipient_code text;

create index if not exists idx_app_users_contract on public.app_users(contract_status);
create index if not exists idx_app_users_referral_code on public.app_users(referral_code);

-- Auto-generate a referral_code the first time someone becomes a referrer.
create or replace function public.fn_generate_referral_code()
returns trigger language plpgsql as $$
begin
  if new.role = 'referrer' and new.referral_code is null then
    new.referral_code := 'REF-' || upper(substr(replace(new.id::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_app_users_referral_code on public.app_users;
create trigger trg_app_users_referral_code
  before insert or update of role on public.app_users
  for each row execute function public.fn_generate_referral_code();

-- ── 2. Worker timesheets ────────────────────────────────────────────
create table if not exists public.worker_timesheets (
  id               uuid primary key default uuid_generate_v4(),
  worker_user_id   uuid not null references public.app_users(id) on delete cascade,
  platform_id      smallint references public.platforms(id),
  work_date        date not null default current_date,
  hours_worked     numeric(5,2) not null check (hours_worked > 0 and hours_worked <= 24),
  hourly_rate_usd  numeric(10,2) not null check (hourly_rate_usd >= 0),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_timesheets_worker on public.worker_timesheets(worker_user_id);
create index if not exists idx_timesheets_date    on public.worker_timesheets(work_date desc);

drop trigger if exists trg_timesheets_updated on public.worker_timesheets;
create trigger trg_timesheets_updated
  before update on public.worker_timesheets
  for each row execute function public.set_updated_at();

alter table public.worker_timesheets enable row level security;

drop policy if exists "timesheets_select" on public.worker_timesheets;
create policy "timesheets_select" on public.worker_timesheets for select
  using (
    worker_user_id = auth.uid()
    or public.get_my_role() = 'admin'
    or (
      public.get_my_role() in ('manager','supervisor')
      and platform_id in (select p.id from public.platforms p
        where p.slug = any(coalesce(public.get_my_platforms(), array[]::text[])))
    )
  );

drop policy if exists "timesheets_insert" on public.worker_timesheets;
create policy "timesheets_insert" on public.worker_timesheets for insert
  with check (worker_user_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "timesheets_update" on public.worker_timesheets;
create policy "timesheets_update" on public.worker_timesheets for update
  using (worker_user_id = auth.uid() or public.get_my_role() = 'admin')
  with check (worker_user_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "timesheets_delete" on public.worker_timesheets;
create policy "timesheets_delete" on public.worker_timesheets for delete
  using (worker_user_id = auth.uid() or public.get_my_role() = 'admin');

-- ── 3. Pay slips (uploaded mid-month, expected month-end amount) ───
create table if not exists public.pay_slips (
  id                  uuid primary key default uuid_generate_v4(),
  worker_user_id      uuid not null references public.app_users(id) on delete cascade,
  platform_id         smallint references public.platforms(id),
  period_month        text not null
                      check (period_month in (
                        'January','February','March','April','May','June',
                        'July','August','September','October','November','December'
                      )),
  period_year         smallint not null check (period_year between 2020 and 2099),
  expected_amount_usd numeric(10,2) not null default 0 check (expected_amount_usd >= 0),
  currency            text not null default 'USD',
  slip_file_url       text,
  issued_by           uuid references public.app_users(id),
  issued_at           timestamptz not null default now(),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (worker_user_id, period_month, period_year)
);

create index if not exists idx_payslips_worker on public.pay_slips(worker_user_id);
create index if not exists idx_payslips_period on public.pay_slips(period_year desc, period_month);

drop trigger if exists trg_payslips_updated on public.pay_slips;
create trigger trg_payslips_updated
  before update on public.pay_slips
  for each row execute function public.set_updated_at();

alter table public.pay_slips enable row level security;

drop policy if exists "payslips_select" on public.pay_slips;
create policy "payslips_select" on public.pay_slips for select
  using (worker_user_id = auth.uid() or public.get_my_role() in ('admin','manager'));

drop policy if exists "payslips_insert" on public.pay_slips;
create policy "payslips_insert" on public.pay_slips for insert
  with check (public.get_my_role() = 'admin');

drop policy if exists "payslips_update" on public.pay_slips;
create policy "payslips_update" on public.pay_slips for update
  using (public.get_my_role() = 'admin');

drop policy if exists "payslips_delete" on public.pay_slips;
create policy "payslips_delete" on public.pay_slips for delete
  using (public.get_my_role() = 'admin');

-- ── 4. Payments (month-end Paystack payouts) ────────────────────────
create table if not exists public.payments (
  id                  uuid primary key default uuid_generate_v4(),
  worker_user_id      uuid not null references public.app_users(id) on delete cascade,
  pay_slip_id         uuid references public.pay_slips(id) on delete set null,
  amount_usd          numeric(10,2) not null check (amount_usd >= 0),
  status              text not null default 'pending'
                      check (status in ('pending','processing','paid','failed')),
  method              text not null default 'paystack',
  paystack_reference  text,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_payments_worker on public.payments(worker_user_id);
create index if not exists idx_payments_status on public.payments(status);

drop trigger if exists trg_payments_updated on public.payments;
create trigger trg_payments_updated
  before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments for select
  using (worker_user_id = auth.uid() or public.get_my_role() in ('admin','manager'));

drop policy if exists "payments_insert" on public.payments;
create policy "payments_insert" on public.payments for insert
  with check (public.get_my_role() = 'admin');

drop policy if exists "payments_update" on public.payments;
create policy "payments_update" on public.payments for update
  using (public.get_my_role() = 'admin');

drop policy if exists "payments_delete" on public.payments;
create policy "payments_delete" on public.payments for delete
  using (public.get_my_role() = 'admin');

-- ── 5. Warning events — progressive escalation, 5 = auto-termination ─
create table if not exists public.warning_events (
  id             uuid primary key default uuid_generate_v4(),
  worker_user_id uuid not null references public.app_users(id) on delete cascade,
  issued_by      uuid references public.app_users(id),
  reason         text not null,
  comment        text,
  is_revoked     boolean not null default false,
  revoked_by     uuid references public.app_users(id),
  revoked_at     timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists idx_warnings_worker on public.warning_events(worker_user_id);
create index if not exists idx_warnings_active on public.warning_events(worker_user_id) where not is_revoked;

alter table public.warning_events enable row level security;

drop policy if exists "warnings_select" on public.warning_events;
create policy "warnings_select" on public.warning_events for select
  using (worker_user_id = auth.uid() or public.get_my_role() in ('admin','manager','supervisor'));

drop policy if exists "warnings_insert" on public.warning_events;
create policy "warnings_insert" on public.warning_events for insert
  with check (public.get_my_role() in ('admin','manager'));

drop policy if exists "warnings_update" on public.warning_events;
create policy "warnings_update" on public.warning_events for update
  using (public.get_my_role() in ('admin','manager'));

create or replace function public.warning_active_count(p_worker uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.warning_events
  where worker_user_id = p_worker and not is_revoked;
$$;

-- 5 active warnings -> automatic contract termination
create or replace function public.fn_warning_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.warning_active_count(new.worker_user_id) >= 5 then
    update public.app_users
      set contract_status = 'terminated', is_active = false
      where id = new.worker_user_id and contract_status <> 'terminated';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_warning_escalation on public.warning_events;
create trigger trg_warning_escalation
  after insert on public.warning_events
  for each row execute function public.fn_warning_escalation();

-- Revoking a warning back below 5 reinstates the contract.
create or replace function public.fn_warning_revoke_check()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_revoked and not old.is_revoked then
    if public.warning_active_count(new.worker_user_id) < 5 then
      update public.app_users
        set contract_status = 'active', is_active = true
        where id = new.worker_user_id and contract_status = 'terminated';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_warning_revoke on public.warning_events;
create trigger trg_warning_revoke
  after update on public.warning_events
  for each row execute function public.fn_warning_revoke_check();

-- ── 6. Worker feedback — admin-only visibility (never managers) ────
create table if not exists public.worker_feedback (
  id             uuid primary key default uuid_generate_v4(),
  worker_user_id uuid not null references public.app_users(id) on delete cascade,
  category       text not null default 'other'
                 check (category in ('manager','process','platform','other')),
  subject        text not null,
  message        text not null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_feedback_worker on public.worker_feedback(worker_user_id);

alter table public.worker_feedback enable row level security;

-- Admins only, plus the worker can see their own submissions. Managers
-- and supervisors intentionally get NO select policy here at all.
drop policy if exists "feedback_select" on public.worker_feedback;
create policy "feedback_select" on public.worker_feedback for select
  using (worker_user_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "feedback_insert" on public.worker_feedback;
create policy "feedback_insert" on public.worker_feedback for insert
  with check (worker_user_id = auth.uid());

-- ── 7. Disputes — pay-slip / hours challenges ───────────────────────
create table if not exists public.disputes (
  id                uuid primary key default uuid_generate_v4(),
  worker_user_id    uuid not null references public.app_users(id) on delete cascade,
  pay_slip_id       uuid references public.pay_slips(id) on delete set null,
  subject           text not null,
  description       text not null,
  status            text not null default 'open'
                    check (status in ('open','in_review','resolved','rejected')),
  resolution_notes  text,
  resolved_by       uuid references public.app_users(id),
  resolved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_disputes_worker on public.disputes(worker_user_id);
create index if not exists idx_disputes_status on public.disputes(status);

drop trigger if exists trg_disputes_updated on public.disputes;
create trigger trg_disputes_updated
  before update on public.disputes
  for each row execute function public.set_updated_at();

alter table public.disputes enable row level security;

drop policy if exists "disputes_select" on public.disputes;
create policy "disputes_select" on public.disputes for select
  using (worker_user_id = auth.uid() or public.get_my_role() in ('admin','manager'));

drop policy if exists "disputes_insert" on public.disputes;
create policy "disputes_insert" on public.disputes for insert
  with check (worker_user_id = auth.uid());

drop policy if exists "disputes_update" on public.disputes;
create policy "disputes_update" on public.disputes for update
  using (
    public.get_my_role() in ('admin','manager')
    or (worker_user_id = auth.uid() and status = 'open')
  );

-- ── 8. Referrals + payout gating ────────────────────────────────────
create table if not exists public.referrals (
  id                        uuid primary key default uuid_generate_v4(),
  referrer_user_id          uuid not null references public.app_users(id) on delete cascade,
  referred_worker_user_id   uuid references public.app_users(id) on delete set null,
  referred_name             text not null,
  referred_email            text,
  status                    text not null default 'pending'
                            check (status in ('pending','active','paid')),
  commission_usd            numeric(10,2) not null default 0 check (commission_usd >= 0),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists idx_referrals_referrer on public.referrals(referrer_user_id);
create index if not exists idx_referrals_status   on public.referrals(status);

drop trigger if exists trg_referrals_updated on public.referrals;
create trigger trg_referrals_updated
  before update on public.referrals
  for each row execute function public.set_updated_at();

alter table public.referrals enable row level security;

drop policy if exists "referrals_select" on public.referrals;
create policy "referrals_select" on public.referrals for select
  using (referrer_user_id = auth.uid() or public.get_my_role() in ('admin','manager'));

drop policy if exists "referrals_insert" on public.referrals;
create policy "referrals_insert" on public.referrals for insert
  with check (public.get_my_role() = 'admin' or referrer_user_id = auth.uid());

drop policy if exists "referrals_update" on public.referrals;
create policy "referrals_update" on public.referrals for update
  using (public.get_my_role() = 'admin');

-- A referrer may only request payout once every referral they own is
-- fully paid ("all green"). Admins bypass this check.
create or replace function public.referrer_payout_eligible(p_referrer uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.referrals
    where referrer_user_id = p_referrer and status <> 'paid'
  ) and exists (
    select 1 from public.referrals where referrer_user_id = p_referrer
  );
$$;

-- ── 9. Payout requests (referral commission or worker early-pay) ───
create table if not exists public.payout_requests (
  id               uuid primary key default uuid_generate_v4(),
  requester_user_id uuid not null references public.app_users(id) on delete cascade,
  type             text not null default 'referral_commission'
                   check (type in ('referral_commission','worker_early_pay')),
  amount_usd       numeric(10,2) not null check (amount_usd >= 0),
  status           text not null default 'pending'
                   check (status in ('pending','approved','rejected','paid')),
  paystack_reference text,
  notes            text,
  requested_at     timestamptz not null default now(),
  processed_by     uuid references public.app_users(id),
  processed_at     timestamptz
);

create index if not exists idx_payouts_requester on public.payout_requests(requester_user_id);
create index if not exists idx_payouts_status    on public.payout_requests(status);

alter table public.payout_requests enable row level security;

drop policy if exists "payouts_select" on public.payout_requests;
create policy "payouts_select" on public.payout_requests for select
  using (requester_user_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "payouts_insert" on public.payout_requests;
create policy "payouts_insert" on public.payout_requests for insert
  with check (requester_user_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "payouts_update" on public.payout_requests;
create policy "payouts_update" on public.payout_requests for update
  using (public.get_my_role() = 'admin');

-- Enforce the referral payout gating rule at the database layer too,
-- so it can't be bypassed by calling the API directly.
create or replace function public.fn_enforce_payout_gating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'referral_commission'
     and public.get_my_role() <> 'admin'
     and not public.referrer_payout_eligible(new.requester_user_id) then
    raise exception 'Payout blocked: not all referred workers have been paid yet';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payout_gating on public.payout_requests;
create trigger trg_payout_gating
  before insert on public.payout_requests
  for each row execute function public.fn_enforce_payout_gating();

-- ── 10. Partner / contact records (Excel import target) ────────────
create table if not exists public.partner_contacts (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  email        text,
  phone        text,
  country      text,
  contact_type text not null default 'partner'
               check (contact_type in ('worker','referrer','partner')),
  source       text,
  notes        text,
  created_by   uuid references public.app_users(id),
  created_at   timestamptz not null default now()
);

create index if not exists idx_partner_contacts_type on public.partner_contacts(contact_type);

alter table public.partner_contacts enable row level security;

drop policy if exists "partner_contacts_select" on public.partner_contacts;
create policy "partner_contacts_select" on public.partner_contacts for select
  using (public.get_my_role() in ('admin','manager'));

drop policy if exists "partner_contacts_insert" on public.partner_contacts;
create policy "partner_contacts_insert" on public.partner_contacts for insert
  with check (public.get_my_role() in ('admin','manager'));

drop policy if exists "partner_contacts_update" on public.partner_contacts;
create policy "partner_contacts_update" on public.partner_contacts for update
  using (public.get_my_role() in ('admin','manager'));

drop policy if exists "partner_contacts_delete" on public.partner_contacts;
create policy "partner_contacts_delete" on public.partner_contacts for delete
  using (public.get_my_role() = 'admin');

-- ── 11. Dashboard views ──────────────────────────────────────────────
create or replace view public.worker_earnings_summary as
  select
    u.id as worker_user_id,
    u.display_name,
    u.email,
    u.contract_status,
    coalesce(ts.month_hours, 0)             as month_hours,
    coalesce(ts.month_earnings_usd, 0)      as month_earnings_usd,
    coalesce(pd.total_paid_usd, 0)          as total_paid_usd,
    coalesce(pd.pending_usd, 0)             as pending_usd,
    public.warning_active_count(u.id)       as active_warnings,
    ps.expected_amount_usd                  as latest_expected_amount_usd,
    ps.period_month                         as latest_period_month,
    ps.period_year                          as latest_period_year
  from public.app_users u
  left join (
    select worker_user_id,
      sum(hours_worked) as month_hours,
      sum(hours_worked * hourly_rate_usd) as month_earnings_usd
    from public.worker_timesheets
    where date_trunc('month', work_date) = date_trunc('month', current_date)
    group by worker_user_id
  ) ts on ts.worker_user_id = u.id
  left join (
    select worker_user_id,
      sum(amount_usd) filter (where status = 'paid')                     as total_paid_usd,
      sum(amount_usd) filter (where status in ('pending','processing'))  as pending_usd
    from public.payments
    group by worker_user_id
  ) pd on pd.worker_user_id = u.id
  left join lateral (
    select expected_amount_usd, period_month, period_year
    from public.pay_slips
    where worker_user_id = u.id
    order by period_year desc,
      array_position(array['January','February','March','April','May','June',
        'July','August','September','October','November','December'], period_month) desc
    limit 1
  ) ps on true
  where u.role = 'worker';

create or replace view public.referral_summary as
  select
    u.id as referrer_user_id,
    u.display_name,
    u.email,
    u.referral_code,
    count(r.id)                                            as total_referred,
    count(r.id) filter (where r.status = 'paid')            as paid_count,
    count(r.id) filter (where r.status = 'pending')         as pending_count,
    count(r.id) filter (where r.status = 'active')          as active_count,
    coalesce(sum(r.commission_usd), 0)                       as total_commission_usd,
    public.referrer_payout_eligible(u.id)                    as eligible_for_payout
  from public.app_users u
  left join public.referrals r on r.referrer_user_id = u.id
  where u.role = 'referrer'
  group by u.id, u.display_name, u.email, u.referral_code;

-- ── 12. Grants ────────────────────────────────────────────────────
grant execute on function public.warning_active_count(uuid) to authenticated;
grant execute on function public.referrer_payout_eligible(uuid) to authenticated;

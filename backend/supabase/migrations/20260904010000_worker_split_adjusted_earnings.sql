-- ═══════════════════════════════════════════════════════════════════
-- PART 14: Worker-facing split-adjusted earnings
--
-- Workers now see their real calculated take-home (hours x rate x
-- their worker %), not the full nominal rate — matching the revenue
-- split configured in Control Tower, if one is. Nothing about the
-- underlying data changes: worker_timesheets still stores the raw
-- nominal hourly_rate_usd (admin needs the true gross figure as the
-- "Gross amount" input to the Pay Slips split calculator). Only the
-- WORKER-FACING display becomes split-adjusted, computed via
-- SECURITY DEFINER functions/views that read the admin-only
-- worker_revenue_overrides table server-side and return only the
-- resulting dollar figures — the percentage itself is never sent to
-- the worker's browser.
--
-- Fallback: a worker with no configured split sees 100% of their
-- nominal rate — unchanged from today's behavior.
-- ═══════════════════════════════════════════════════════════════════

-- A worker's own effective hourly rate, after their split.
create or replace function public.my_effective_hourly_rate()
returns numeric
language sql stable security definer set search_path = public as $$
  select round(coalesce(u.hourly_rate_usd, 0) * coalesce(wro.worker_percentage, 100) / 100, 2)
  from public.app_users u
  left join public.worker_revenue_overrides wro on wro.worker_user_id = u.id
  where u.id = auth.uid();
$$;
grant execute on function public.my_effective_hourly_rate() to authenticated;

-- The calling worker's own timesheet entries, with earnings already
-- split-adjusted. Explicitly scoped to auth.uid() inside the function
-- body (not relying on caller RLS), so it is safe to grant broadly —
-- a caller can only ever get their own rows back.
create or replace function public.my_timesheet_earnings()
returns table (
  id uuid,
  work_date date,
  hours_worked numeric,
  notes text,
  earnings_usd numeric
)
language sql stable security definer set search_path = public as $$
  select
    ts.id,
    ts.work_date,
    ts.hours_worked,
    ts.notes,
    round(ts.hours_worked * ts.hourly_rate_usd * coalesce(wro.worker_percentage, 100) / 100, 2) as earnings_usd
  from public.worker_timesheets ts
  left join public.worker_revenue_overrides wro on wro.worker_user_id = ts.worker_user_id
  where ts.worker_user_id = auth.uid()
  order by ts.work_date desc;
$$;
grant execute on function public.my_timesheet_earnings() to authenticated;

-- worker_earnings_summary.month_earnings_usd now reflects the same
-- split-adjusted figure, so the "Logged Earnings" stat card and the
-- per-entry list always agree.
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
    select ts.worker_user_id,
      sum(ts.hours_worked) as month_hours,
      sum(ts.hours_worked * ts.hourly_rate_usd * coalesce(wro.worker_percentage, 100) / 100) as month_earnings_usd
    from public.worker_timesheets ts
    left join public.worker_revenue_overrides wro on wro.worker_user_id = ts.worker_user_id
    where date_trunc('month', ts.work_date) = date_trunc('month', current_date)
    group by ts.worker_user_id
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

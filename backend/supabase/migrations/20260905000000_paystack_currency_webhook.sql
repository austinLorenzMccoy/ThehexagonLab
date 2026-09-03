-- ═══════════════════════════════════════════════════════════════════
-- PART 15: Paystack payout currency preference, FX settlement audit,
-- and transfer-status reconciliation
--
-- Closes doc/paystack_integration_guide.md gaps #2 (currency
-- mismatch), #3 (no webhook/final-status confirmation), and #4
-- (duplicate-payment race) for both settlement paths (pay slips ->
-- payments, payout_requests). Gap #1 (recipient-creation UI) is a
-- frontend/API-route change with no schema impact beyond reading
-- payout_currency below.
--
-- Workers/referrers can request USD or NGN as their payout currency;
-- the app converts the stored *_usd figure to that currency at a live
-- rate right before calling Paystack, and records exactly what was
-- sent (currency, rate, settled amount) for audit. A row is claimed
-- (status = 'processing') BEFORE calling Paystack, closing the race
-- where two concurrent "Mark Paid" clicks could both reach Paystack
-- before either write landed. A webhook endpoint reconciles async
-- transfer.success / transfer.failed / transfer.reversed events
-- against these claimed rows.
-- ═══════════════════════════════════════════════════════════════════

-- Self-service preference — not sensitive, so a worker/referrer sets
-- this on their own row via the RPC below rather than needing an
-- admin. Defaults to NGN, Paystack's native transfer currency.
alter table public.app_users
  add column if not exists payout_currency text not null default 'NGN'
    check (payout_currency in ('NGN', 'USD'));

create or replace function public.set_my_payout_currency(new_currency text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if new_currency not in ('NGN', 'USD') then
    raise exception 'Unsupported payout currency: %', new_currency;
  end if;
  update public.app_users set payout_currency = new_currency where id = auth.uid();
end;
$$;
grant execute on function public.set_my_payout_currency(text) to authenticated;

-- Settlement audit columns — what actually got sent, not just the
-- nominal USD figure the slip/request was denominated in. Null means
-- "settled manually, no Paystack transfer occurred."
alter table public.payments
  add column if not exists currency text,
  add column if not exists fx_rate numeric(12,6),
  add column if not exists amount_settled numeric(12,2),
  add column if not exists paystack_transfer_code text;

alter table public.payout_requests
  add column if not exists currency text,
  add column if not exists fx_rate numeric(12,6),
  add column if not exists amount_settled numeric(12,2),
  add column if not exists paystack_transfer_code text;

-- payout_requests.status needs 'processing' (claimed, Paystack call in
-- flight) and 'failed' (transfer rejected or reversed) alongside the
-- existing values — payments.status already has both.
alter table public.payout_requests drop constraint if exists payout_requests_status_check;
alter table public.payout_requests add constraint payout_requests_status_check
  check (status in ('pending','approved','rejected','processing','paid','failed'));

-- Claim-before-transfer for pay slips: a 'processing' row reserves the
-- slip the instant an admin/manager clicks Mark Paid, before any
-- Paystack call happens — widened from the old paid-only guard so two
-- concurrent clicks can't both reach Paystack for the same slip.
drop index if exists idx_payments_one_paid_per_slip;
create unique index if not exists idx_payments_one_active_per_slip
  on public.payments(pay_slip_id)
  where status in ('processing', 'paid') and pay_slip_id is not null;

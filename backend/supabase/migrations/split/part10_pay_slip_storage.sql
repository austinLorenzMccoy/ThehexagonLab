-- ═══════════════════════════════════════════════════════════════════
-- PART 10: Pay slip file storage
--
-- Closes the "admin uploads official pay slips" gap in
-- doc/Worker_Recovery_System_PRD.md §4.3 / §3 (Admin capability
-- "upload pay slips"). Adds a private Supabase Storage bucket for
-- pay-slip documents (PDF/image) referenced by
-- public.pay_slips.slip_file_url, with RLS scoping uploads/reads to
-- worker-id-prefixed folders. Additive only — safe to re-run.
--
-- Run in Supabase SQL Editor AFTER 20260902000000_worker_recovery.sql.
-- ═══════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('pay-slips', 'pay-slips', false)
on conflict (id) do nothing;

-- Files are stored at `${worker_user_id}/${filename}` so RLS can scope
-- a worker's read access to their own folder via storage.foldername().

drop policy if exists "payslip_objects_admin_all" on storage.objects;
create policy "payslip_objects_admin_all" on storage.objects for all
  using (bucket_id = 'pay-slips' and public.get_my_role() = 'admin')
  with check (bucket_id = 'pay-slips' and public.get_my_role() = 'admin');

drop policy if exists "payslip_objects_manager_select" on storage.objects;
create policy "payslip_objects_manager_select" on storage.objects for select
  using (bucket_id = 'pay-slips' and public.get_my_role() = 'manager');

drop policy if exists "payslip_objects_worker_select_own" on storage.objects;
create policy "payslip_objects_worker_select_own" on storage.objects for select
  using (bucket_id = 'pay-slips' and (storage.foldername(name))[1] = auth.uid()::text);

-- At most one 'paid' payment per pay slip — prevents a double-click (or
-- two admins acting at once) on "Mark Paid" from producing two Paystack
-- transfers for the same slip. The app catches the resulting unique
-- violation (23505) and reports "already paid" instead of erroring.
create unique index if not exists idx_payments_one_paid_per_slip
  on public.payments(pay_slip_id)
  where status = 'paid' and pay_slip_id is not null;

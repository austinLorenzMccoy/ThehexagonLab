-- ═══════════════════════════════════════════════════════════════════
-- PART 12: Manager permission swap — Pay Slips in, Warnings/Disputes out
--
-- Product decision: Managers now manage Pay Slips (issue, upload,
-- and settle month-end payment) instead of Warnings & Disputes, which
-- become admin-only. Nothing here changes worker-facing access —
-- workers still see their own pay slips/warnings/disputes, and can
-- still raise a dispute or update their own still-open one.
-- ═══════════════════════════════════════════════════════════════════

-- ── Pay slips — managers can now issue/edit/delete ──────────────────
drop policy if exists "payslips_insert" on public.pay_slips;
create policy "payslips_insert" on public.pay_slips for insert
  with check (public.get_my_role() in ('admin','manager'));

drop policy if exists "payslips_update" on public.pay_slips;
create policy "payslips_update" on public.pay_slips for update
  using (public.get_my_role() in ('admin','manager'));

drop policy if exists "payslips_delete" on public.pay_slips;
create policy "payslips_delete" on public.pay_slips for delete
  using (public.get_my_role() in ('admin','manager'));

-- ── Payments — managers can now record/settle (Mark Paid) ───────────
drop policy if exists "payments_insert" on public.payments;
create policy "payments_insert" on public.payments for insert
  with check (public.get_my_role() in ('admin','manager'));

drop policy if exists "payments_update" on public.payments;
create policy "payments_update" on public.payments for update
  using (public.get_my_role() in ('admin','manager'));

drop policy if exists "payments_delete" on public.payments;
create policy "payments_delete" on public.payments for delete
  using (public.get_my_role() in ('admin','manager'));

-- ── Pay-slip file storage — managers can now upload/view/delete ─────
drop policy if exists "payslip_objects_admin_all" on storage.objects;
drop policy if exists "payslip_objects_manager_select" on storage.objects;
create policy "payslip_objects_manage" on storage.objects for all
  using (bucket_id = 'pay-slips' and public.get_my_role() in ('admin','manager'))
  with check (bucket_id = 'pay-slips' and public.get_my_role() in ('admin','manager'));

-- ── Warning events — admin-only from here ────────────────────────────
drop policy if exists "warnings_select" on public.warning_events;
create policy "warnings_select" on public.warning_events for select
  using (worker_user_id = auth.uid() or public.get_my_role() in ('admin','supervisor'));

drop policy if exists "warnings_insert" on public.warning_events;
create policy "warnings_insert" on public.warning_events for insert
  with check (public.get_my_role() = 'admin');

drop policy if exists "warnings_update" on public.warning_events;
create policy "warnings_update" on public.warning_events for update
  using (public.get_my_role() = 'admin');

-- ── Disputes — admin-only resolution from here ───────────────────────
-- Workers can still raise a dispute and update/withdraw their own
-- still-open one; managers can no longer view or resolve the queue.
drop policy if exists "disputes_select" on public.disputes;
create policy "disputes_select" on public.disputes for select
  using (worker_user_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "disputes_update" on public.disputes;
create policy "disputes_update" on public.disputes for update
  using (
    public.get_my_role() = 'admin'
    or (worker_user_id = auth.uid() and status = 'open')
  );

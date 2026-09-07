-- ═══════════════════════════════════════════════════════════════════
-- PART 20: Managers regain Warnings & Disputes access
--
-- Product decision: managers now issue/revoke warnings and resolve
-- disputes again, alongside admins (see PART 12 for the prior swap
-- that made these admin-only). Nothing here changes worker-facing
-- access — workers still see and manage only their own rows.
-- ═══════════════════════════════════════════════════════════════════

-- ── Warning events — managers can view, issue, and revoke ───────────
drop policy if exists "warnings_select" on public.warning_events;
create policy "warnings_select" on public.warning_events for select
  using (worker_user_id = auth.uid() or public.get_my_role() in ('admin','manager','supervisor'));

drop policy if exists "warnings_insert" on public.warning_events;
create policy "warnings_insert" on public.warning_events for insert
  with check (public.get_my_role() in ('admin','manager'));

drop policy if exists "warnings_update" on public.warning_events;
create policy "warnings_update" on public.warning_events for update
  using (public.get_my_role() in ('admin','manager'));

-- ── Disputes — managers can view and resolve the queue again ────────
drop policy if exists "disputes_select" on public.disputes;
create policy "disputes_select" on public.disputes for select
  using (worker_user_id = auth.uid() or public.get_my_role() in ('admin','manager'));

drop policy if exists "disputes_update" on public.disputes;
create policy "disputes_update" on public.disputes for update
  using (
    public.get_my_role() in ('admin','manager')
    or (worker_user_id = auth.uid() and status = 'open')
  );

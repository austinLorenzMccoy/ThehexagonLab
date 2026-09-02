-- ═══════════════════════════════════════════════════════════════════
-- PART 11: Tracker — real Manager assignment
--
-- Replaces the "Linker A/B/C/D/Self" placeholder concept on
-- worker_tracker with a real reference to a Manager user account
-- (app_users.role = 'manager'). Additive: the old `linker` column
-- stays in place (now nullable, no longer written by the app) so no
-- historical data is lost — it can be dropped later once confirmed
-- unused.
-- ═══════════════════════════════════════════════════════════════════

alter table public.worker_tracker
  add column if not exists manager_id uuid references public.app_users(id) on delete set null;

alter table public.worker_tracker
  alter column linker drop not null;

create index if not exists idx_tracker_manager on public.worker_tracker(manager_id);

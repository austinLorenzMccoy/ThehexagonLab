-- ═══════════════════════════════════════════════════════════════════
-- PART 18: Link Registry / Partner Contacts rows to a real account
--
-- workers_registry and partner_contacts have never had a link to
-- app_users — they're informal/pre-account records. Adds a nullable
-- linked_user_id so an admin can provision a real account for a
-- worker/referrer directly from these pages (see
-- POST /api/admin/users/invite) and attach a Paystack payout code to
-- it immediately, without leaving the page. `on delete set null` so
-- deleting the account later doesn't take the operational record with
-- it.
-- ═══════════════════════════════════════════════════════════════════

alter table public.workers_registry
  add column if not exists linked_user_id uuid references public.app_users(id) on delete set null;

alter table public.partner_contacts
  add column if not exists linked_user_id uuid references public.app_users(id) on delete set null;

create index if not exists idx_registry_linked_user on public.workers_registry(linked_user_id);
create index if not exists idx_partner_contacts_linked_user on public.partner_contacts(linked_user_id);

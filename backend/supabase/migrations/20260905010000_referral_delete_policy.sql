-- ═══════════════════════════════════════════════════════════════════
-- PART 16: Referrals — admin delete policy
--
-- referrals only ever had select/insert/update policies — no delete,
-- so a referral entered by mistake could never be removed. Adds an
-- admin-only delete policy, consistent with tracker/registry/orders/
-- payroll/partner_contacts delete policies elsewhere. The
-- referral_revenue_overrides row for a deleted referral is cleaned up
-- automatically (its FK is `on delete cascade`).
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "referrals_delete" on public.referrals;
create policy "referrals_delete" on public.referrals for delete
  using (public.get_my_role() = 'admin');

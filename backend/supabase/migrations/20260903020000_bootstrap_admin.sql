-- ═══════════════════════════════════════════════════════════════════
-- PART 13: Bootstrap admin — first-sign-in email auto-promoted to admin
--
-- New sign-ins default to role='worker' (see handle_new_user() in
-- init.sql), and only an existing admin can promote anyone else — so
-- the very first admin can't be granted through the normal app flow.
-- This designates one email as the bootstrap admin: on first sign-in
-- it gets 'admin' instead of 'worker'; an existing row for that email
-- is promoted too, in case they already signed in before this ran.
--
-- Swap the email later (e.g. to the real client admin) with:
--   update public.app_config set value = 'new@email.com'
--   where key = 'bootstrap_admin_email';
-- ═══════════════════════════════════════════════════════════════════

insert into public.app_config (key, value) values
  ('bootstrap_admin_email', 'austinchibueze35@gmail.com')
on conflict (key) do update set value = excluded.value;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_users (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    case when new.email = public.get_app_config('bootstrap_admin_email')
         then 'admin' else 'worker' end
  )
  on conflict (id) do update
    set email        = excluded.email,
        display_name = coalesce(public.app_users.display_name, excluded.display_name),
        last_sign_in = now();
  return new;
end;
$$;

-- Promote retroactively in case they already signed in before this ran
update public.app_users
set role = 'admin'
where email = (select value from public.app_config where key = 'bootstrap_admin_email')
  and role <> 'admin';

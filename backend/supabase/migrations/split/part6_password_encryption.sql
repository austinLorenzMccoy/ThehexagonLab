-- ═══════════════════════════════════════════════════════════════════
-- Password Encryption for Onboarding Table
-- Run this in Supabase SQL Editor AFTER part4_onboarding.sql
-- ═══════════════════════════════════════════════════════════════════

-- Function to encrypt password on insert/update
create or replace function public.fn_encrypt_onboarding_password()
returns trigger language plpgsql security definer as $$
begin
  if new.password is not null and new.password != '' then
    -- Use pgcrypto to encrypt with a server-side key
    new.password := encode(
      encrypt(
        convert_to(new.password, 'utf8'),
        convert_to(coalesce(get_app_config('encryption_key'), 'wh-default-key-change-me'), 'utf8'),
        'aes'
      ),
      'base64'
    );
  end if;
  return new;
end;
$$;

-- Apply to inserts and updates on the password column
create trigger trg_encrypt_onboarding_pw
  before insert or update of password on public.onboarding
  for each row execute function public.fn_encrypt_onboarding_password();

-- Decrypt function for API use (admin-only via security definer)
create or replace function public.decrypt_onboarding_password(row_id uuid)
returns text language plpgsql security definer as $$
declare
  v_encrypted text;
  v_role text;
begin
  -- Only admins can decrypt
  select role into v_role from public.app_users where id = auth.uid();
  if v_role != 'admin' then
    return '***RESTRICTED***';
  end if;

  select password into v_encrypted from public.onboarding where id = row_id;
  if v_encrypted is null then return null; end if;

  return convert_from(
    decrypt(
      decode(v_encrypted, 'base64'),
      convert_to(coalesce(get_app_config('encryption_key'), 'wh-default-key-change-me'), 'utf8'),
      'aes'
    ),
    'utf8'
  );
end;
$$;

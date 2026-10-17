-- EDIT THE EMAIL BELOW. Run as database owner in Supabase SQL Editor.
-- The account must ALREADY exist in Authentication > Users with verified email.
-- Never put this statement in browser code or expose service_role credentials.
BEGIN;
INSERT INTO public.platform_admins(user_id)
SELECT id FROM auth.users
WHERE lower(email)=lower('REPLACE_WITH_YOUR_VERIFIED_EMAIL@example.com')
  AND email_confirmed_at IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;
COMMIT;

-- MUST return one row after you replace email:
SELECT p.user_id,u.email
FROM public.platform_admins p
JOIN auth.users u ON u.id=p.user_id
WHERE lower(u.email)=lower('REPLACE_WITH_YOUR_VERIFIED_EMAIL@example.com');

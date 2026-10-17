-- Read-only installation checks: no changes to database.
SELECT tablename,rowsecurity AS rls_on FROM pg_tables
WHERE schemaname='public'
AND tablename IN ('admins','exams','questions','studentReport',
  'institutions','institution_members','institution_applications',
  'platform_admins','institution_audit') ORDER BY tablename;

SELECT count(*) AS total_exams,
  count(institution_id) AS assigned_exams,
  count(*) - count(institution_id) AS unassigned_exams
FROM public.exams;

SELECT i.name,i.code,count(m.user_id) AS total_members
FROM public.institutions i
LEFT JOIN public.institution_members m ON m.institution_id=i.id
GROUP BY i.id,i.name,i.code ORDER BY i.name;

SELECT count(*) AS platform_owner_accounts FROM public.platform_admins;

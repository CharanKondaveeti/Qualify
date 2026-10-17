-- Verification only; no changes.
SELECT routine_name FROM information_schema.routines
WHERE routine_schema='public' AND routine_name LIKE 'qualify_%institution%'
ORDER BY routine_name;
SELECT tablename,rowsecurity AS rls_on FROM pg_tables
WHERE schemaname='public' AND tablename IN
('institutions','institution_members','institution_applications','institution_invitations');
SELECT count(*) AS existing_exams,
       count(institution_id) AS assigned_exams,
       count(*)-count(institution_id) AS unassigned_exams
FROM public.exams;

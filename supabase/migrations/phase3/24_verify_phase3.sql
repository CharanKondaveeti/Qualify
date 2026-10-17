-- Run this read-only check after all Phase 3 files. Do not run SELECT * on private student tables.
SELECT 'exams without institution' AS check_name, count(*) AS count FROM public.exams WHERE institution_id IS NULL
UNION ALL
SELECT 'bank questions without institution',count(*) FROM public.qualify_question_bank WHERE institution_id IS NULL
UNION ALL
SELECT 'exams whose creator is not a member',count(*) FROM public.exams e
 WHERE NOT EXISTS (SELECT 1 FROM public.institution_members m
   WHERE m.institution_id=e.institution_id AND m.user_id=e.created_by);
SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public'
 AND tablename IN ('exams','questions','studentReport','qualify_events','qualify_question_bank');
SELECT routine_name FROM information_schema.routines
 WHERE routine_schema='public' AND routine_name IN
 ('qualify_exam_can_manage','qualify_can_create_institution_exam',
 'qualify_institution_transfer_exam','qualify_exam_in_active_institution');

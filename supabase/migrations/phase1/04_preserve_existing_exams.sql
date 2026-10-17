-- Preserve each existing admin's private exam ownership.
-- A separate private legacy institution is created per existing admin.
-- All existing exam UUIDs, question rows, student links and results are unchanged.
BEGIN;

INSERT INTO public.institutions(name,code,is_legacy,created_by)
SELECT 'Legacy workspace ' || left(a.id::text,8),
       'legacy-' || replace(a.id::text,'-',''), true, a.id
FROM public.admins a
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.institution_members(institution_id,user_id,role,status)
SELECT i.id,a.id,'institution_super_admin','active'
FROM public.admins a
JOIN public.institutions i ON i.code='legacy-' || replace(a.id::text,'-','')
ON CONFLICT (institution_id,user_id) DO NOTHING;

UPDATE public.exams e
SET institution_id = i.id
FROM public.institutions i
WHERE e.institution_id IS NULL
  AND i.code = 'legacy-' || replace(e.created_by::text,'-','');

COMMIT;

-- If unassigned_count > 0, do NOT delete those exams: review their created_by.
SELECT count(*) AS unassigned_count FROM public.exams WHERE institution_id IS NULL;

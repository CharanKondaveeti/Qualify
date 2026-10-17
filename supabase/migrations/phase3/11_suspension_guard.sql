-- Phase 3 / 11: neutral read-only guard used by student-facing RPCs.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_exam_in_active_institution(p_exam uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $func$
 SELECT EXISTS (SELECT 1 FROM public.exams e
  JOIN public.institutions i ON i.id=e.institution_id
  WHERE e.exam_id=p_exam AND i.status='active');
$func$;
REVOKE ALL ON FUNCTION public.qualify_exam_in_active_institution(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qualify_exam_in_active_institution(uuid) TO anon,authenticated;
COMMIT;

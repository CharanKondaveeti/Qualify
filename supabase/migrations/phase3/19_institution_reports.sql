-- Phase 3 / 19: guarded institution-wide summary (no student identities).
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_institution_report_summary(p_institution uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $func$
DECLARE result jsonb;
BEGIN
 IF NOT public.qualify_can_create_institution_exam(p_institution) THEN
  RAISE EXCEPTION 'Institution membership required'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'exam_id',t.exam_id,'title',t.title,'exam_status',t.exam_status,
   'registrations',t.registrations,'submitted',t.submitted,'average_score',t.average_score
 ) ORDER BY t.title),'[]'::jsonb) INTO result
 FROM (
   SELECT e.exam_id,e.title,e.exam_status,
      count(a.student_report_id)::int AS registrations,
      count(a.student_report_id) FILTER (WHERE a.student_status='submitted')::int AS submitted,
      round(avg(a.marks_scored) FILTER (WHERE a.student_status='submitted')::numeric,2) AS average_score
   FROM public.exams e
   LEFT JOIN public."studentReport" a ON a.exam_id=e.exam_id
   WHERE e.institution_id=p_institution AND public.qualify_exam_can_manage(e.exam_id)
   GROUP BY e.exam_id,e.title,e.exam_status
 ) t;
 RETURN result;
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_institution_report_summary(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_institution_report_summary(uuid) TO authenticated;
COMMIT;

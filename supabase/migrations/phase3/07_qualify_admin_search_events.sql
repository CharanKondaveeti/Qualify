-- Phase 3 / 07: guarded qualify_admin_search_events for institutional exam roles.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_admin_search_events(p_exam uuid, p_search text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $func$
DECLARE
  result jsonb;
  query_text text := left(btrim(coalesce(p_search, '')), 120);
BEGIN
  IF NOT public.qualify_exam_can_manage(p_exam) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'student_name', result_row.student_name,
    'roll_no', result_row.roll_no,
    'kind', result_row.kind,
    'created_at', result_row.created_at
  ) ORDER BY result_row.created_at DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT a.student_name, a.roll_no, v.kind, v.created_at
    FROM public.qualify_events v
    JOIN public."studentReport" a ON a.student_report_id = v.student_report_id
    WHERE a.exam_id = p_exam
      AND (
        query_text = ''
        OR a.student_name ILIKE '%' || query_text || '%'
        OR a.roll_no ILIKE '%' || query_text || '%'
        OR a.email ILIKE '%' || query_text || '%'
        OR replace(v.kind, '_', ' ') ILIKE '%' || query_text || '%'
      )
    ORDER BY v.created_at DESC
    LIMIT 300
   ) result_row;
  RETURN result;
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_admin_search_events(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_admin_search_events(uuid,text) TO authenticated;
COMMIT;

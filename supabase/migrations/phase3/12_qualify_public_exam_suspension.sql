-- Phase 3 / 12: deny exam traffic when its institution is suspended.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_public_exam(p_exam uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.exams%ROWTYPE;
BEGIN
 IF NOT public.qualify_exam_in_active_institution(p_exam) THEN RAISE EXCEPTION 'This institution is suspended'; END IF;
 SELECT * INTO e FROM public.exams WHERE exam_id = p_exam AND exam_status IN ('upcoming','active');
 IF NOT FOUND THEN RAISE EXCEPTION 'This exam is unavailable'; END IF;
 RETURN jsonb_build_object('exam_id',e.exam_id,'title',e.title,'course',e.course,
    'exam_status',e.exam_status,'scheduled_date',e.scheduled_date,
    'duration_minutes',e.duration_minutes,'total_marks',e.total_marks,
    'total_questions',e.total_questions,'instructions',e.instructions);
END; $$;
REVOKE ALL ON FUNCTION public.qualify_public_exam(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qualify_public_exam(uuid) TO anon,authenticated;
COMMIT;

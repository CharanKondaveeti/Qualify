-- Phase 3 / 17: deny exam traffic when its institution is suspended.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_results(p_attempt uuid,p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public."studentReport"%ROWTYPE; e public.exams%ROWTYPE;
BEGIN
 IF NOT public.qualify_exam_in_active_institution((SELECT exam_id FROM public."studentReport" WHERE student_report_id=p_attempt)) THEN RAISE EXCEPTION 'This institution is suspended'; END IF;
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt;
 IF NOT FOUND OR a.access_hash IS NULL OR
   a.access_hash <> encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') THEN
   RAISE EXCEPTION 'Invalid private result link';
 END IF;
 SELECT * INTO e FROM public.exams WHERE exam_id=a.exam_id;
 IF a.student_status <> 'submitted' THEN RETURN jsonb_build_object('status','pending'); END IF;
 IF NOT e.results_published THEN RETURN jsonb_build_object('status','unpublished'); END IF;
 RETURN jsonb_build_object('status','published','title',e.title,'student_name',a.student_name,
   'roll_no',a.roll_no,'score',a.marks_scored,'total_marks',e.total_marks,
   'pass_mark',e.pass_mark,'passed',a.marks_scored>=e.pass_mark,'submitted_at',a.submitted_at);
END; $$;
REVOKE ALL ON FUNCTION public.qualify_results(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qualify_results(uuid,text) TO anon,authenticated;
COMMIT;

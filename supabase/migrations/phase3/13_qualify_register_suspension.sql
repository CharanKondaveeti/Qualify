-- Phase 3 / 13: deny exam traffic when its institution is suspended.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_register(p_exam uuid, p_name text, p_email text, p_roll text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a uuid; t text;
BEGIN
 IF NOT public.qualify_exam_in_active_institution(p_exam) THEN RAISE EXCEPTION 'This institution is suspended'; END IF;
 IF length(btrim(coalesce(p_name,''))) NOT BETWEEN 2 AND 120 OR
    length(btrim(coalesce(p_roll,''))) NOT BETWEEN 1 AND 80 OR
    length(btrim(coalesce(p_email,''))) NOT BETWEEN 5 AND 254 OR
    btrim(p_email) NOT LIKE '%@%.%' THEN
   RAISE EXCEPTION 'Enter a valid name, email and roll number';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.exams WHERE exam_id = p_exam AND exam_status = 'upcoming') THEN
   RAISE EXCEPTION 'Registration is closed for this exam';
 END IF;
 t := encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO public."studentReport" (exam_id,student_name,email,roll_no,access_hash)
 VALUES (p_exam,btrim(p_name),lower(btrim(p_email)),btrim(p_roll),encode(extensions.digest(t,'sha256'),'hex'))
 RETURNING student_report_id INTO a;
 RETURN jsonb_build_object('student_report_id',a,'access_token',t);
EXCEPTION WHEN unique_violation THEN
 RAISE EXCEPTION 'This email or roll number is already registered';
END; $$;
REVOKE ALL ON FUNCTION public.qualify_register(uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qualify_register(uuid,text,text,text) TO anon,authenticated;
COMMIT;

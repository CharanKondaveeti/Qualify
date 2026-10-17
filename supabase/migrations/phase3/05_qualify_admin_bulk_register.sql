-- Phase 3 / 05: guarded qualify_admin_bulk_register for institutional exam roles.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_admin_bulk_register(p_exam uuid,p_students jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE r jsonb; out_rows jsonb := '[]'::jsonb; t text; aid uuid;
BEGIN
 IF NOT public.qualify_exam_can_manage(p_exam) OR NOT EXISTS (
   SELECT 1 FROM public.exams WHERE exam_id=p_exam AND exam_status='upcoming') THEN
   RAISE EXCEPTION 'Only the owner can import registrations into upcoming exams';
 END IF;
 IF jsonb_typeof(p_students)<>'array' OR jsonb_array_length(p_students) NOT BETWEEN 1 AND 500 THEN
   RAISE EXCEPTION 'Please supply 1 to 500 students';
 END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p_students) LOOP
   IF length(btrim(coalesce(r->>'name',''))) NOT BETWEEN 2 AND 120 OR
      length(btrim(coalesce(r->>'email',''))) NOT BETWEEN 5 AND 254 OR
      length(btrim(coalesce(r->>'roll_no',''))) NOT BETWEEN 1 AND 80 THEN
      RAISE EXCEPTION 'Invalid student name, email or roll number';
   END IF;
   t:=encode(extensions.gen_random_bytes(32),'hex');
   INSERT INTO public."studentReport"(exam_id,student_name,email,roll_no,access_hash)
   VALUES(p_exam,btrim(r->>'name'),lower(btrim(r->>'email')),btrim(r->>'roll_no'),encode(extensions.digest(t,'sha256'),'hex'))
   RETURNING student_report_id INTO aid;
   out_rows:=out_rows || jsonb_build_array(jsonb_build_object('student_report_id',aid,
     'name',r->>'name','email',r->>'email','roll_no',r->>'roll_no','access_token',t));
 END LOOP;
 RETURN out_rows;
END; $$;
REVOKE ALL ON FUNCTION public.qualify_admin_bulk_register(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_admin_bulk_register(uuid,jsonb) TO authenticated;
COMMIT;

-- Phase 3 / 03: guarded qualify_create_exam for institutional exam roles.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_create_exam(p_exam jsonb,p_questions jsonb)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE eid uuid; q jsonb; total integer:=0; n integer; data_options jsonb;
 v_institution uuid; v_count integer;
BEGIN
 v_institution:=nullif(p_exam->>'institution_id','')::uuid;
 IF v_institution IS NULL THEN
   SELECT i.id INTO v_institution FROM public.institutions i
   JOIN public.institution_members m ON m.institution_id=i.id
   WHERE m.user_id=(SELECT auth.uid()) AND i.is_legacy=true
      AND i.status='active' AND m.status='active' LIMIT 1;
   IF v_institution IS NULL THEN
     SELECT count(*),min(m.institution_id) INTO v_count,v_institution
     FROM public.institution_members m JOIN public.institutions i ON i.id=m.institution_id
     WHERE m.user_id=(SELECT auth.uid()) AND m.status='active' AND i.status='active';
     IF v_count<>1 THEN RAISE EXCEPTION 'Choose an institution before creating an exam'; END IF;
   END IF;
 END IF;
 IF NOT public.qualify_can_create_institution_exam(v_institution) THEN
   RAISE EXCEPTION 'You cannot create exams in this institution'; END IF;
 IF jsonb_typeof(p_questions)<>'array' OR jsonb_array_length(p_questions) NOT BETWEEN 1 AND 200 THEN
   RAISE EXCEPTION 'Please add 1 to 200 questions';
 END IF;
 FOR q IN SELECT value FROM jsonb_array_elements(p_questions) LOOP
    data_options:=q->'options';
    IF length(btrim(coalesce(q->>'question_text','')))=0 OR jsonb_typeof(data_options)<>'array'
       OR jsonb_array_length(data_options) NOT BETWEEN 2 AND 6 OR (q->>'correct_option')::integer
         NOT BETWEEN 0 AND jsonb_array_length(data_options)-1
       OR (q->>'marks')::integer < 1 THEN
      RAISE EXCEPTION 'A question has invalid text, options, correct index, or marks';
    END IF;
    total:=total+(q->>'marks')::integer;
 END LOOP;
 IF total <> (p_exam->>'total_marks')::integer THEN
   RAISE EXCEPTION 'Total marks must equal the sum of question marks (%)',total;
 END IF;
 IF coalesce((p_exam->>'pass_mark')::integer,0)>total THEN RAISE EXCEPTION 'Pass mark exceeds total marks'; END IF;
 -- Generate exam UUID before the insert. This avoids INSERT...RETURNING...INTO.
 eid := gen_random_uuid();
 INSERT INTO public.exams(exam_id,title,course,exam_status,scheduled_date,duration_minutes,total_marks,total_questions,
   pass_mark,created_by,shuffle_questions,shuffle_options,instructions,institution_id)
 VALUES(eid,btrim(p_exam->>'title'),btrim(p_exam->>'course'),'upcoming',
  (p_exam->>'scheduled_date')::timestamptz,(p_exam->>'duration_minutes')::integer,total,
  jsonb_array_length(p_questions),0,auth.uid(),
  coalesce((p_exam->>'shuffle_questions')::boolean,true),coalesce((p_exam->>'shuffle_options')::boolean,true),
  coalesce(p_exam->>'instructions','Answer all questions carefully'),v_institution);
 FOR q IN SELECT value FROM jsonb_array_elements(p_questions) LOOP
   INSERT INTO public.questions(exam_id,question_text,options,correct_option,marks)
   VALUES(eid,q->>'question_text',q->'options',(q->>'correct_option')::integer,(q->>'marks')::integer);
 END LOOP;
 UPDATE public.exams SET pass_mark=coalesce((p_exam->>'pass_mark')::integer,0) WHERE exam_id=eid;
 RETURN eid;
END; $$;
REVOKE ALL ON FUNCTION public.qualify_create_exam(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_create_exam(jsonb,jsonb) TO authenticated;
COMMIT;

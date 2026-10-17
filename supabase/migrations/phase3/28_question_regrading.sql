-- Apply after 26. Original questions and submitted answers remain immutable.
BEGIN;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS grading_revision integer NOT NULL DEFAULT 0;

CREATE TABLE public.qualify_question_corrections (
  question_id uuid PRIMARY KEY REFERENCES public.questions(question_id),
  exam_id uuid NOT NULL REFERENCES public.exams(exam_id),
  correct_option integer,
  excluded boolean NOT NULL DEFAULT false,
  CHECK (excluded OR correct_option IS NOT NULL)
);
CREATE TABLE public.qualify_regrade_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(exam_id),
  question_id uuid NOT NULL REFERENCES public.questions(question_id),
  actor_id uuid NOT NULL,
  actor_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  revision integer NOT NULL,
  previous_correction jsonb,
  correction jsonb NOT NULL,
  old_total integer NOT NULL,
  new_total integer NOT NULL,
  old_pass_mark integer NOT NULL,
  new_pass_mark integer NOT NULL,
  was_published boolean NOT NULL,
  score_changes jsonb NOT NULL,
  UNIQUE (exam_id,revision)
);
CREATE INDEX qualify_regrade_history_exam ON public.qualify_regrade_history(exam_id,created_at DESC);
ALTER TABLE public.qualify_question_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualify_regrade_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qualify_question_corrections, public.qualify_regrade_history FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.qualify_question_corrections, public.qualify_regrade_history TO authenticated;
CREATE POLICY corrections_read ON public.qualify_question_corrections FOR SELECT TO authenticated
  USING (public.qualify_exam_can_manage(exam_id));
CREATE POLICY regrade_history_read ON public.qualify_regrade_history FOR SELECT TO authenticated
  USING (public.qualify_exam_can_manage(exam_id));

CREATE OR REPLACE FUNCTION public.qualify_regrade_score_internal(
  p_attempt uuid, p_question uuid, p_correct integer, p_excluded boolean
) RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE a public."studentReport"%ROWTYPE; q record; selected integer; actual integer; earned integer:=0;
  expected integer; skip_question boolean; raw_answer text; mapping jsonb;
BEGIN
 SELECT * INTO a FROM public."studentReport" WHERE student_report_id=p_attempt;
 FOR q IN SELECT x.*,c.correct_option AS revised_correct,c.excluded AS revised_excluded
   FROM public.questions x LEFT JOIN public.qualify_question_corrections c ON c.question_id=x.question_id
   WHERE x.exam_id=a.exam_id LOOP
   expected:=coalesce(q.revised_correct,q.correct_option);
   skip_question:=coalesce(q.revised_excluded,false);
   IF q.question_id=p_question THEN expected:=p_correct; skip_question:=p_excluded; END IF;
   IF skip_question THEN CONTINUE; END IF;
   raw_answer:=a.answers->>q.question_id::text;
   IF raw_answer IS NULL THEN CONTINUE; END IF;
   IF raw_answer !~ '^[0-9]{1,2}$' THEN RAISE EXCEPTION 'An attempt has invalid saved answer data'; END IF;
   selected:=raw_answer::integer;
   mapping:=a.option_orders->q.question_id::text;
   -- Never treat a randomized display index as the original answer index.
   IF mapping IS NULL OR jsonb_typeof(mapping)<>'array' THEN
     RAISE EXCEPTION 'An answered question has no option mapping; this legacy attempt needs review before regrading';
   END IF;
   IF selected >= jsonb_array_length(mapping) OR (mapping->>selected) IS NULL OR
      (mapping->>selected) !~ '^[0-9]{1,2}$' THEN RAISE EXCEPTION 'An attempt has an invalid option mapping'; END IF;
   actual:=(mapping->>selected)::integer;
   IF actual >= jsonb_array_length(q.options) THEN RAISE EXCEPTION 'An attempt has an invalid original option index'; END IF;
   IF actual=expected THEN earned:=earned+q.marks; END IF;
 END LOOP;
 RETURN earned;
END; $$;
REVOKE ALL ON FUNCTION public.qualify_regrade_score_internal(uuid,uuid,integer,boolean) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.qualify_regrade(
  p_exam uuid,p_question uuid,p_correct integer,p_excluded boolean,
  p_pass_mark integer,p_reason text,p_signature text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.exams%ROWTYPE; q public.questions%ROWTYPE; a record;
  total integer; score integer; rows jsonb:='[]'::jsonb; signature text;
  previous jsonb; candidate jsonb; result jsonb; changed integer:=0;
BEGIN
 SELECT * INTO e FROM public.exams WHERE exam_id=p_exam FOR UPDATE;
 IF NOT FOUND OR NOT public.qualify_exam_can_manage(p_exam) THEN RAISE EXCEPTION 'Exam administrator access required'; END IF;
 IF e.exam_status<>'completed' OR EXISTS (SELECT 1 FROM public."studentReport" WHERE exam_id=p_exam AND student_status='in progress') THEN
   RAISE EXCEPTION 'Complete all attempts before correcting and regrading this exam';
 END IF;
 SELECT * INTO q FROM public.questions WHERE exam_id=p_exam AND question_id=p_question;
 IF NOT FOUND THEN RAISE EXCEPTION 'Question not found in this exam'; END IF;
 IF p_excluded IS NULL OR (NOT p_excluded AND (p_correct IS NULL OR p_correct<0 OR p_correct>=jsonb_array_length(q.options))) THEN
   RAISE EXCEPTION 'Select a valid correct answer or exclude the question';
 END IF;
 IF length(btrim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 2000 THEN RAISE EXCEPTION 'Record a reason of 5–2000 characters'; END IF;
 SELECT coalesce(sum(x.marks),0)::integer INTO total FROM public.questions x
 LEFT JOIN public.qualify_question_corrections c ON c.question_id=x.question_id
 WHERE x.exam_id=p_exam AND NOT (CASE WHEN x.question_id=p_question THEN p_excluded ELSE coalesce(c.excluded,false) END);
 IF total<1 THEN RAISE EXCEPTION 'At least one scored question must remain'; END IF;
 IF p_pass_mark IS NULL OR p_pass_mark<0 OR p_pass_mark>total THEN RAISE EXCEPTION 'Qualifying mark must be between 0 and %',total; END IF;
 FOR a IN SELECT * FROM public."studentReport" WHERE exam_id=p_exam AND student_status='submitted'
   ORDER BY student_report_id FOR UPDATE LOOP
   score:=public.qualify_regrade_score_internal(a.student_report_id,p_question,p_correct,p_excluded);
   IF score IS DISTINCT FROM a.marks_scored OR (score>=p_pass_mark) IS DISTINCT FROM (a.marks_scored>=e.pass_mark) THEN changed:=changed+1; END IF;
   rows:=rows || jsonb_build_array(jsonb_build_object('id',a.student_report_id,'name',a.student_name,'roll_no',a.roll_no,
     'old_score',a.marks_scored,'new_score',score,'old_passed',a.marks_scored>=e.pass_mark,'new_passed',score>=p_pass_mark));
 END LOOP;
 SELECT to_jsonb(c) INTO previous FROM public.qualify_question_corrections c WHERE question_id=p_question;
 candidate:=jsonb_build_object('question_id',p_question,'correct_option',CASE WHEN p_excluded THEN NULL ELSE p_correct END,'excluded',p_excluded);
 signature:=md5(jsonb_build_object('exam',p_exam,'revision',e.grading_revision,'previous',previous,'candidate',candidate,
   'total',total,'old_total',e.total_marks,'pass',p_pass_mark,'old_pass',e.pass_mark,'published',e.results_published,'rows',rows,'reason',btrim(p_reason))::text);
 result:=jsonb_build_object('signature',signature,'students',rows,'affected',changed,'old_total',e.total_marks,'new_total',total,
   'old_pass_mark',e.pass_mark,'new_pass_mark',p_pass_mark,'revision',e.grading_revision+1);
 IF p_signature IS NULL THEN RETURN result; END IF;
 IF p_signature<>signature THEN RAISE EXCEPTION 'Results changed since preview. Preview again before applying.'; END IF;
 INSERT INTO public.qualify_question_corrections(question_id,exam_id,correct_option,excluded)
 VALUES(p_question,p_exam,CASE WHEN p_excluded THEN NULL ELSE p_correct END,p_excluded)
 ON CONFLICT(question_id) DO UPDATE SET correct_option=EXCLUDED.correct_option,excluded=EXCLUDED.excluded;
 UPDATE public."studentReport" a SET marks_scored=(r.value->>'new_score')::integer
 FROM jsonb_array_elements(rows) r WHERE a.student_report_id=(r.value->>'id')::uuid;
 UPDATE public.exams SET total_marks=total,pass_mark=p_pass_mark,results_published=false,grading_revision=e.grading_revision+1 WHERE exam_id=p_exam;
 INSERT INTO public.qualify_regrade_history(exam_id,question_id,actor_id,actor_label,reason,revision,previous_correction,correction,
   old_total,new_total,old_pass_mark,new_pass_mark,was_published,score_changes)
 VALUES(p_exam,p_question,auth.uid(),coalesce(auth.jwt()->>'email',auth.uid()::text),btrim(p_reason),e.grading_revision+1,previous,candidate,
   e.total_marks,total,e.pass_mark,p_pass_mark,e.results_published,rows);
 RETURN result || jsonb_build_object('applied',true);
END; $$;
REVOKE ALL ON FUNCTION public.qualify_regrade(uuid,uuid,integer,boolean,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_regrade(uuid,uuid,integer,boolean,integer,text,text) TO authenticated;
COMMIT;

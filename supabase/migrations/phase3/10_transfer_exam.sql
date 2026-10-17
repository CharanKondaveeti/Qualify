-- Phase 3 / 10: only an institution Super Admin may transfer exam ownership.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_institution_transfer_exam(p_exam uuid,p_new_owner uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $func$
DECLARE e public.exams%ROWTYPE;
BEGIN
 SELECT * INTO e FROM public.exams WHERE exam_id=p_exam FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Exam not found'; END IF;
 IF NOT public.qualify_is_institution_super(e.institution_id) THEN
   RAISE EXCEPTION 'Only an active institution Super Admin can transfer exams'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.institution_members m JOIN public.institutions i ON i.id=m.institution_id
   WHERE m.institution_id=e.institution_id AND m.user_id=p_new_owner
     AND m.status='active' AND i.status='active'
     AND m.role IN ('staff_admin','institution_super_admin')
 ) THEN RAISE EXCEPTION 'New owner must be active staff of the same institution'; END IF;
 IF e.created_by=p_new_owner THEN RETURN jsonb_build_object('ok',true); END IF;
 UPDATE public.exams SET created_by=p_new_owner WHERE exam_id=p_exam;
 INSERT INTO public.institution_audit(institution_id,actor_id,action,details)
 VALUES(e.institution_id,(SELECT auth.uid()),'exam_ownership_transferred',
   jsonb_build_object('exam_id',p_exam,'old_owner_id',e.created_by,'new_owner_id',p_new_owner));
 RETURN jsonb_build_object('ok',true);
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_institution_transfer_exam(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_institution_transfer_exam(uuid,uuid) TO authenticated;
COMMIT;

-- Phase 2 / 05: change role or suspend/reactivate. Keep at least one active Super Admin.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_manage_institution_member(
 p_institution uuid,p_user uuid,p_role text,p_status text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $func$
DECLARE v_old public.institution_members%ROWTYPE; v_active int;
BEGIN
 IF NOT (public.qualify_is_platform_owner() OR public.qualify_is_institution_super(p_institution)) THEN
   RAISE EXCEPTION 'Institution manager access required'; END IF;
 IF p_role NOT IN ('staff_admin','institution_super_admin') OR p_status NOT IN ('active','suspended') THEN
   RAISE EXCEPTION 'Invalid member role or status'; END IF;
 -- Serialize changes to Super Admin membership per institution.
 PERFORM 1 FROM public.institutions WHERE id=p_institution FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Institution not found'; END IF;
 SELECT * INTO v_old FROM public.institution_members
 WHERE institution_id=p_institution AND user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;
 IF v_old.role='institution_super_admin' AND v_old.status='active'
   AND (p_role<>'institution_super_admin' OR p_status<>'active') THEN
   SELECT count(*) INTO v_active FROM public.institution_members
   WHERE institution_id=p_institution AND role='institution_super_admin' AND status='active';
   IF v_active<=1 THEN RAISE EXCEPTION 'Cannot remove the last active Super Admin'; END IF;
 END IF;
 UPDATE public.institution_members SET role=p_role,status=p_status
 WHERE institution_id=p_institution AND user_id=p_user;
 INSERT INTO public.institution_audit(institution_id,actor_id,action,details)
 VALUES(p_institution,(SELECT auth.uid()),'member_updated',
 jsonb_build_object('user_id',p_user,'role',p_role,'status',p_status));
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_manage_institution_member(uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_manage_institution_member(uuid,uuid,text,text) TO authenticated;
COMMIT;

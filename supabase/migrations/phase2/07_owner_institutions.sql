-- Phase 2 / 07: verified owner can list institutions and suspend/reactivate one.
BEGIN;
CREATE OR REPLACE FUNCTION public.qualify_owner_list_institutions()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $func$
DECLARE v_data jsonb;
BEGIN
 IF NOT public.qualify_is_platform_owner() THEN RAISE EXCEPTION 'Platform Owner required'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'name',i.name,'code',i.code,
 'status',i.status,'is_legacy',i.is_legacy,'created_at',i.created_at,
 'member_count',(SELECT count(*) FROM public.institution_members m WHERE m.institution_id=i.id))
 ORDER BY i.created_at DESC),'[]'::jsonb) INTO v_data FROM public.institutions i;
 RETURN v_data;
END;
$func$;
CREATE OR REPLACE FUNCTION public.qualify_owner_set_institution_status(p_institution uuid,p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $func$
BEGIN
 IF NOT public.qualify_is_platform_owner() THEN RAISE EXCEPTION 'Platform Owner required'; END IF;
 IF p_status NOT IN ('active','suspended') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.institutions WHERE id=p_institution) THEN
  RAISE EXCEPTION 'Institution not found'; END IF;
 UPDATE public.institutions SET status=p_status WHERE id=p_institution;
 INSERT INTO public.institution_audit(institution_id,actor_id,action,details)
 VALUES(p_institution,(SELECT auth.uid()),'institution_status_changed',jsonb_build_object('status',p_status));
END;
$func$;
REVOKE ALL ON FUNCTION public.qualify_owner_list_institutions() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.qualify_owner_set_institution_status(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.qualify_owner_list_institutions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.qualify_owner_set_institution_status(uuid,text) TO authenticated;
COMMIT;

-- Phase 2 / 01: add invitations. Does not modify student attempts or exams.
BEGIN;
CREATE TABLE IF NOT EXISTS public.institution_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
 invited_email text NOT NULL,
 role text NOT NULL CHECK(role IN ('staff_admin','institution_super_admin')),
 token_hash text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','revoked')),
 invited_by uuid NOT NULL REFERENCES auth.users(id),
 accepted_by uuid REFERENCES auth.users(id),
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '7 days'),
 created_at timestamptz NOT NULL DEFAULT now(),
 accepted_at timestamptz,
 CONSTRAINT invitation_email_valid CHECK (invited_email = lower(btrim(invited_email)) AND invited_email LIKE '%@%.%')
);
CREATE INDEX IF NOT EXISTS institution_invitations_list_idx
  ON public.institution_invitations(institution_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS institution_one_pending_invite
  ON public.institution_invitations(institution_id,invited_email)
  WHERE status='pending';
ALTER TABLE public.institution_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.institution_invitations FROM PUBLIC,anon,authenticated;
-- All reads/writes go through narrow SECURITY DEFINER functions below.
COMMIT;

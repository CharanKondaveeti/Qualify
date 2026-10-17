-- PHASE 1: create additive institutional tables. NO existing tables are removed.
-- Run on your existing Qualify database (after the earlier secure upgrade).
BEGIN;

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 3 AND 160),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  is_legacy boolean NOT NULL DEFAULT false,
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.institution_members (
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('institution_super_admin','staff_admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (institution_id,user_id)
);

CREATE TABLE IF NOT EXISTS public.institution_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  applicant_email text NOT NULL,
  institution_name text NOT NULL CHECK (char_length(btrim(institution_name)) BETWEEN 3 AND 160),
  requested_code text NOT NULL CHECK (requested_code ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  website text CHECK (website IS NULL OR char_length(website) <= 500),
  details text CHECK (details IS NULL OR char_length(details) <= 1500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_application_per_user
  ON public.institution_applications (applicant_user_id) WHERE status='pending';
CREATE INDEX IF NOT EXISTS institution_applications_queue_idx
  ON public.institution_applications(status,created_at DESC);
CREATE INDEX IF NOT EXISTS institution_members_user_idx
  ON public.institution_members(user_id,status);

CREATE TABLE IF NOT EXISTS public.institution_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.institution_applications(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Nullable at first so existing exams and student links are never rejected.
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.institutions(id);
CREATE INDEX IF NOT EXISTS exams_institution_idx ON public.exams(institution_id);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_audit ENABLE ROW LEVEL SECURITY;

-- No direct client-side writes to roles, applications, or institutions.
REVOKE ALL ON public.platform_admins,public.institutions,public.institution_members,
  public.institution_applications,public.institution_audit FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.platform_admins,public.institutions,public.institution_members,
  public.institution_applications,public.institution_audit TO authenticated;

COMMIT;

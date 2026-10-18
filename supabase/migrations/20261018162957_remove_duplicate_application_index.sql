SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
DO $cleanup$
DECLARE duplicate_def text; retained_def text;
BEGIN
  SELECT pg_get_indexdef(indexrelid) INTO retained_def FROM pg_index
  WHERE indexrelid = to_regclass('public.one_pending_application_per_user') AND indisvalid AND indisunique;
  SELECT pg_get_indexdef(indexrelid) INTO duplicate_def FROM pg_index
  WHERE indexrelid = to_regclass('public.qualify_one_pending_application_per_applicant') AND indisvalid AND indisunique;
  IF duplicate_def IS NOT NULL THEN
    IF retained_def IS NULL OR replace(duplicate_def, 'qualify_one_pending_application_per_applicant', 'one_pending_application_per_user') <> retained_def THEN
      RAISE EXCEPTION 'Expected identical valid unique indexes; stopping cleanup';
    END IF;
    DROP INDEX public.qualify_one_pending_application_per_applicant;
  END IF;
END;
$cleanup$;

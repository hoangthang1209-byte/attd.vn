-- Remove obsolete homepage workshop activity taxonomy.
-- Forward-only cleanup after 0079/0080 were already applied to the shared database.

ALTER TABLE "HomepageWorkshopMedia"
  DROP COLUMN IF EXISTS "activity";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'HomepageWorkshopActivity'
      AND n.nspname = 'public'
  ) THEN
    DROP TYPE "HomepageWorkshopActivity";
  END IF;
END $$;

-- P0.1B-lite: separate admin-usable categories from public website visibility.
-- Default true preserves current production behavior for all existing rows.
ALTER TABLE "Category" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;

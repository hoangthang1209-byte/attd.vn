-- Keep Homepage CMS expansion deploy-safe for existing rows and partial writes.

ALTER TABLE "HomepageSettings"
  ALTER COLUMN "companyRealityEnabled" DROP NOT NULL,
  ALTER COLUMN "companyRealityEyebrow" DROP NOT NULL,
  ALTER COLUMN "companyRealityTitle" DROP NOT NULL,
  ALTER COLUMN "companyRealityDescription" DROP NOT NULL,
  ALTER COLUMN "companyRealityLayout" DROP NOT NULL,
  ALTER COLUMN "workshopGalleryEnabled" DROP NOT NULL,
  ALTER COLUMN "workshopGalleryEyebrow" DROP NOT NULL,
  ALTER COLUMN "workshopGalleryTitle" DROP NOT NULL,
  ALTER COLUMN "workshopGalleryDescription" DROP NOT NULL,
  ALTER COLUMN "workshopGalleryLayout" DROP NOT NULL,
  ALTER COLUMN "workshopGalleryMaxItems" DROP NOT NULL;

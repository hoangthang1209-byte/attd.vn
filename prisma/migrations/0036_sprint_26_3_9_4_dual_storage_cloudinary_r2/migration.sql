-- Sprint 26.3.9.4 — Dual storage: Cloudinary images + Cloudflare R2 production source files

CREATE TYPE "MediaStorageProvider" AS ENUM ('CLOUDINARY', 'CLOUDFLARE_R2');

ALTER TABLE "MediaAsset"
  ADD COLUMN "storageProvider" "MediaStorageProvider" NOT NULL DEFAULT 'CLOUDINARY';

CREATE INDEX "MediaAsset_storageProvider_idx" ON "MediaAsset"("storageProvider");

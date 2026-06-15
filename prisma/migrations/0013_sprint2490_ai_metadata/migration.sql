-- Sprint 24.9.0: Add aiMetadata to BlogPost for knowledge-aware generation audit trail
ALTER TABLE "BlogPost" ADD COLUMN "aiMetadata" JSONB;

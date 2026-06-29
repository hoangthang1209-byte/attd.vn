-- Sprint D2: B2B Portal auth fields on DealerUser + LOGIN activity type

-- AlterEnum
ALTER TYPE "DealerActivityType" ADD VALUE IF NOT EXISTS 'LOGIN';

-- AlterTable
ALTER TABLE "DealerUser" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "DealerUser" ADD COLUMN IF NOT EXISTS "passwordSetAt" TIMESTAMP(3);
ALTER TABLE "DealerUser" ADD COLUMN IF NOT EXISTS "invitedAt" TIMESTAMP(3);
ALTER TABLE "DealerUser" ADD COLUMN IF NOT EXISTS "loginDisabledReason" TEXT;

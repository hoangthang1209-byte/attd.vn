-- AlterTable
ALTER TABLE "SiteNavigationSettings" ADD COLUMN     "copyrightText" TEXT NOT NULL DEFAULT 'ATTD.vn',
ADD COLUMN     "showCurrentYear" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showTaxCode" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "originText" TEXT NOT NULL DEFAULT 'Designed & Manufactured in Vietnam',
ADD COLUMN     "legalLinkLabel" TEXT NOT NULL DEFAULT 'Chính sách đại lý',
ADD COLUMN     "legalLinkHref" TEXT NOT NULL DEFAULT '/chinh-sach-dai-ly',
ADD COLUMN     "showLegalLink" BOOLEAN NOT NULL DEFAULT true;

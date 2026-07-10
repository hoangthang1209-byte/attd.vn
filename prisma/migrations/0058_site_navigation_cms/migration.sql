-- Site Navigation & Footer CMS

CREATE TYPE "SiteNavPlacement" AS ENUM (
  'UTILITY_BAR',
  'HEADER_MENU',
  'CATEGORY_NAV',
  'MOBILE_MENU',
  'FOOTER_PRODUCTS',
  'FOOTER_SERVICES',
  'FOOTER_COMPANY'
);

CREATE TYPE "SiteNavLinkTarget" AS ENUM ('INTERNAL', 'EXTERNAL');

CREATE TYPE "SiteNavCtaSlot" AS ENUM (
  'HEADER_PRIMARY',
  'MOBILE_NAV_PRIMARY',
  'MOBILE_NAV_SECONDARY',
  'FOOTER',
  'MOBILE_ACTION_PRIMARY',
  'MOBILE_ACTION_SECONDARY'
);

CREATE TABLE "SiteNavigationSettings" (
  "id" TEXT NOT NULL,
  "utilityTagline" TEXT NOT NULL DEFAULT 'Kho sỉ đồng phục & quà tặng doanh nghiệp',
  "megaMenuTriggerLabel" TEXT NOT NULL DEFAULT 'Tất cả danh mục',
  "searchPlaceholder" TEXT NOT NULL DEFAULT 'Tìm áo thun, áo polo, nón, quà tặng…',
  "useCategoryTreeMegaMenu" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SiteNavigationSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteNavItem" (
  "id" TEXT NOT NULL,
  "settingsId" TEXT NOT NULL DEFAULT 'default',
  "placement" "SiteNavPlacement" NOT NULL,
  "parentId" TEXT,
  "label" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "description" TEXT,
  "iconKey" TEXT,
  "linkTarget" "SiteNavLinkTarget" NOT NULL DEFAULT 'INTERNAL',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "showDesktop" BOOLEAN NOT NULL DEFAULT true,
  "showMobile" BOOLEAN NOT NULL DEFAULT true,
  "openInNewTab" BOOLEAN NOT NULL DEFAULT false,
  "trackEvent" TEXT,

  CONSTRAINT "SiteNavItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteNavCta" (
  "id" TEXT NOT NULL,
  "settingsId" TEXT NOT NULL DEFAULT 'default',
  "slot" "SiteNavCtaSlot" NOT NULL,
  "label" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "trackEvent" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "showDesktop" BOOLEAN NOT NULL DEFAULT true,
  "showMobile" BOOLEAN NOT NULL DEFAULT true,
  "openInNewTab" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "SiteNavCta_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteSocialLink" (
  "id" TEXT NOT NULL,
  "settingsId" TEXT NOT NULL DEFAULT 'default',
  "platform" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "SiteSocialLink_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SiteNavItem"
  ADD CONSTRAINT "SiteNavItem_settingsId_fkey"
  FOREIGN KEY ("settingsId") REFERENCES "SiteNavigationSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SiteNavItem"
  ADD CONSTRAINT "SiteNavItem_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "SiteNavItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SiteNavCta"
  ADD CONSTRAINT "SiteNavCta_settingsId_fkey"
  FOREIGN KEY ("settingsId") REFERENCES "SiteNavigationSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SiteSocialLink"
  ADD CONSTRAINT "SiteSocialLink_settingsId_fkey"
  FOREIGN KEY ("settingsId") REFERENCES "SiteNavigationSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "SiteNavItem_settingsId_placement_sortOrder_idx" ON "SiteNavItem"("settingsId", "placement", "sortOrder");
CREATE INDEX "SiteNavItem_parentId_sortOrder_idx" ON "SiteNavItem"("parentId", "sortOrder");
CREATE UNIQUE INDEX "SiteNavCta_settingsId_slot_key" ON "SiteNavCta"("settingsId", "slot");
CREATE UNIQUE INDEX "SiteSocialLink_settingsId_platform_key" ON "SiteSocialLink"("settingsId", "platform");
CREATE INDEX "SiteSocialLink_settingsId_sortOrder_idx" ON "SiteSocialLink"("settingsId", "sortOrder");

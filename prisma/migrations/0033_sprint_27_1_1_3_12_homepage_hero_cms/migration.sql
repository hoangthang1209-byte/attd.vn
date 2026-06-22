-- CreateTable
CREATE TABLE "HomepageSettings" (
    "id" TEXT NOT NULL,
    "heroEyebrow" TEXT NOT NULL DEFAULT 'Nền tảng nguồn hàng B2B',
    "heroHeading" TEXT NOT NULL DEFAULT 'Nguồn hàng đồng phục & quà tặng cho doanh nghiệp',
    "heroDescription" TEXT NOT NULL DEFAULT 'Khám phá sản phẩm sẵn kho, đặt OEM theo yêu cầu và kết nối nguồn hàng phù hợp cho đơn vị của bạn.',
    "heroPrimaryCtaLabel" TEXT NOT NULL DEFAULT 'Khám phá nguồn hàng',
    "heroPrimaryCtaUrl" TEXT NOT NULL DEFAULT '#home-categories',
    "heroSecondaryCtaLabel" TEXT NOT NULL DEFAULT 'Liên hệ báo giá sỉ',
    "heroSecondaryCtaUrl" TEXT NOT NULL DEFAULT '/lien-he',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageSettings_pkey" PRIMARY KEY ("id")
);

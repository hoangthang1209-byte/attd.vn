-- Sprint 10.3: Media Asset Intelligence Foundation
-- Additive: preserves all URLs, storage keys, IDs, and relations.

CREATE TYPE "MediaCollectionType" AS ENUM ('PROJECT', 'CAMPAIGN', 'CUSTOMER', 'PRODUCT_LINE', 'CONTENT', 'EVENT', 'INTERNAL', 'OTHER');
CREATE TYPE "MediaAssetType" AS ENUM ('PHOTO', 'ILLUSTRATION', 'LOGO', 'ICON', 'MOCKUP', 'SCREENSHOT', 'DIAGRAM', 'DOCUMENT_PREVIEW', 'VIDEO_THUMBNAIL', 'OTHER');
CREATE TYPE "MediaAiProcessingStatus" AS ENUM ('NOT_PROCESSED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');
CREATE TYPE "MediaSeoReadinessStatus" AS ENUM ('INCOMPLETE', 'BASIC', 'READY', 'EXCELLENT');
CREATE TYPE "MediaVocabularyType" AS ENUM ('SUBJECT', 'MATERIAL', 'COLOR', 'TECHNIQUE', 'INDUSTRY', 'AUDIENCE', 'USE_CASE');

ALTER TABLE "MediaCollection"
  ADD COLUMN "collectionType" "MediaCollectionType" NOT NULL DEFAULT 'OTHER';

CREATE INDEX "MediaCollection_collectionType_idx" ON "MediaCollection"("collectionType");

CREATE TABLE "MediaVocabularyTerm" (
  "id" TEXT NOT NULL,
  "type" "MediaVocabularyType" NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MediaVocabularyTerm_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaVocabularyTerm_type_name_key" ON "MediaVocabularyTerm"("type", "name");
CREATE INDEX "MediaVocabularyTerm_type_isActive_sortOrder_idx" ON "MediaVocabularyTerm"("type", "isActive", "sortOrder");
CREATE INDEX "MediaVocabularyTerm_code_idx" ON "MediaVocabularyTerm"("code");

ALTER TABLE "MediaAsset"
  ADD COLUMN "assetType" "MediaAssetType" NOT NULL DEFAULT 'PHOTO',
  ADD COLUMN "subjectTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "materialTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "colorTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "techniqueTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "industryTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "audienceTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "useCaseTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "seoScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "metadataCompleteness" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "seoReadinessStatus" "MediaSeoReadinessStatus" NOT NULL DEFAULT 'INCOMPLETE',
  ADD COLUMN "aiProcessingStatus" "MediaAiProcessingStatus" NOT NULL DEFAULT 'NOT_PROCESSED',
  ADD COLUMN "aiProcessedAt" TIMESTAMP(3),
  ADD COLUMN "aiProcessingError" TEXT,
  ADD COLUMN "aiMetadataVersion" TEXT;

CREATE INDEX "MediaAsset_assetType_idx" ON "MediaAsset"("assetType");
CREATE INDEX "MediaAsset_seoReadinessStatus_idx" ON "MediaAsset"("seoReadinessStatus");
CREATE INDEX "MediaAsset_aiProcessingStatus_idx" ON "MediaAsset"("aiProcessingStatus");
CREATE INDEX "MediaAsset_seoScore_idx" ON "MediaAsset"("seoScore");

-- Idempotent system vocabulary seed
INSERT INTO "MediaVocabularyTerm" ("id", "type", "code", "name", "aliases", "sortOrder", "isActive", "isSystem", "createdAt", "updatedAt")
VALUES
  ('mvt_subject_ao_thun', 'SUBJECT', 'AO_THUN', 'Áo thun', ARRAY['t-shirt', 'tee']::TEXT[], 10, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_ao_polo', 'SUBJECT', 'AO_POLO', 'Áo polo', ARRAY['polo']::TEXT[], 20, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_hoodie', 'SUBJECT', 'HOODIE', 'Hoodie', ARRAY['áo hoodie']::TEXT[], 30, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_sweater', 'SUBJECT', 'SWEATER', 'Sweater', ARRAY['áo sweater']::TEXT[], 40, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_ao_khoac', 'SUBJECT', 'AO_KHOAC', 'Áo khoác', ARRAY['jacket']::TEXT[], 50, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_non', 'SUBJECT', 'NON', 'Nón', ARRAY['mũ', 'cap', 'hat']::TEXT[], 60, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_tui_tote', 'SUBJECT', 'TUI_TOTE', 'Túi tote', ARRAY['tote bag']::TEXT[], 70, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_bandana', 'SUBJECT', 'BANDANA', 'Bandana', ARRAY[]::TEXT[], 80, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_binh_giu_nhiet', 'SUBJECT', 'BINH_GIU_NHIET', 'Bình giữ nhiệt', ARRAY['tumbler']::TEXT[], 90, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_dong_phuc', 'SUBJECT', 'DONG_PHUC', 'Đồng phục', ARRAY['uniform']::TEXT[], 100, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_qua_tang_doanh_nghiep', 'SUBJECT', 'QUA_TANG_DOANH_NGHIEP', 'Quà tặng doanh nghiệp', ARRAY['corporate gift']::TEXT[], 110, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_vai', 'SUBJECT', 'VAI', 'Vải', ARRAY['fabric']::TEXT[], 120, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_logo', 'SUBJECT', 'LOGO', 'Logo', ARRAY[]::TEXT[], 130, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_nha_may', 'SUBJECT', 'NHA_MAY', 'Nhà máy', ARRAY['factory']::TEXT[], 140, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_cong_nhan', 'SUBJECT', 'CONG_NHAN', 'Công nhân', ARRAY['worker']::TEXT[], 150, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_may_moc', 'SUBJECT', 'MAY_MOC', 'Máy móc', ARRAY['machine']::TEXT[], 160, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_bao_bi', 'SUBJECT', 'BAO_BI', 'Bao bì', ARRAY['packaging']::TEXT[], 170, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_subject_nhan_mac', 'SUBJECT', 'NHAN_MAC', 'Nhãn mác', ARRAY['label', 'tag']::TEXT[], 180, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_material_cotton', 'MATERIAL', 'COTTON', 'Cotton', ARRAY['cotton 100%']::TEXT[], 10, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_material_polyester', 'MATERIAL', 'POLYESTER', 'Polyester', ARRAY[]::TEXT[], 20, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_material_cotton_pha', 'MATERIAL', 'COTTON_PHA', 'Cotton pha', ARRAY['TC', 'CVC']::TEXT[], 30, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_material_thun_ca_sau', 'MATERIAL', 'THUN_CA_SAU', 'Thun cá sấu', ARRAY['pique']::TEXT[], 40, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_material_ni', 'MATERIAL', 'NI', 'Nỉ', ARRAY['fleece']::TEXT[], 50, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_material_jean_denim', 'MATERIAL', 'JEAN_DENIM', 'Jean / Denim', ARRAY['denim', 'jean']::TEXT[], 60, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_material_canvas', 'MATERIAL', 'CANVAS', 'Canvas', ARRAY[]::TEXT[], 70, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_material_lua', 'MATERIAL', 'LUA', 'Lụa', ARRAY['silk']::TEXT[], 80, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_material_kim_loai', 'MATERIAL', 'KIM_LOAI', 'Kim loại', ARRAY['metal']::TEXT[], 90, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_material_nhua', 'MATERIAL', 'NHUA', 'Nhựa', ARRAY['plastic']::TEXT[], 100, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_material_giay', 'MATERIAL', 'GIAY', 'Giấy', ARRAY['paper']::TEXT[], 110, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_color_trang', 'COLOR', 'TRANG', 'Trắng', ARRAY['white']::TEXT[], 10, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_color_den', 'COLOR', 'DEN', 'Đen', ARRAY['black']::TEXT[], 20, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_color_xam', 'COLOR', 'XAM', 'Xám', ARRAY['grey', 'gray']::TEXT[], 30, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_color_do', 'COLOR', 'DO', 'Đỏ', ARRAY['red']::TEXT[], 40, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_color_do_do', 'COLOR', 'DO_DO', 'Đỏ đô', ARRAY['maroon', 'burgundy']::TEXT[], 50, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_color_xanh_navy', 'COLOR', 'XANH_NAVY', 'Xanh navy', ARRAY['navy']::TEXT[], 60, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_color_xanh_duong', 'COLOR', 'XANH_DUONG', 'Xanh dương', ARRAY['blue']::TEXT[], 70, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_color_xanh_la', 'COLOR', 'XANH_LA', 'Xanh lá', ARRAY['green']::TEXT[], 80, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_color_xanh_ngoc', 'COLOR', 'XANH_NGOC', 'Xanh ngọc', ARRAY['teal', 'cyan']::TEXT[], 90, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_color_vang', 'COLOR', 'VANG', 'Vàng', ARRAY['yellow']::TEXT[], 100, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_color_cam', 'COLOR', 'CAM', 'Cam', ARRAY['orange']::TEXT[], 110, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_color_hong', 'COLOR', 'HONG', 'Hồng', ARRAY['pink']::TEXT[], 120, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_color_tim', 'COLOR', 'TIM', 'Tím', ARRAY['purple']::TEXT[], 130, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_color_be', 'COLOR', 'BE', 'Be', ARRAY['beige']::TEXT[], 140, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_color_nau', 'COLOR', 'NAU', 'Nâu', ARRAY['brown']::TEXT[], 150, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_color_nhieu_mau', 'COLOR', 'NHIEU_MAU', 'Nhiều màu', ARRAY['multicolor']::TEXT[], 160, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_technique_in_lua', 'TECHNIQUE', 'IN_LUA', 'In lụa', ARRAY['screen print']::TEXT[], 10, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_technique_in_chuyen_nhiet', 'TECHNIQUE', 'IN_CHUYEN_NHIET', 'In chuyển nhiệt', ARRAY['sublimation']::TEXT[], 20, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_technique_in_dtg', 'TECHNIQUE', 'IN_DTG', 'In DTG', ARRAY['DTG']::TEXT[], 30, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_technique_in_dtf', 'TECHNIQUE', 'IN_DTF', 'In DTF', ARRAY['DTF']::TEXT[], 40, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_technique_theu', 'TECHNIQUE', 'THEU', 'Thêu', ARRAY['embroidery']::TEXT[], 50, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_technique_ep_nhiet', 'TECHNIQUE', 'EP_NHIET', 'Ép nhiệt', ARRAY['heat press']::TEXT[], 60, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_technique_wash', 'TECHNIQUE', 'WASH', 'Wash', ARRAY['giặt wash']::TEXT[], 70, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_technique_may', 'TECHNIQUE', 'MAY', 'May', ARRAY['sewing']::TEXT[], 80, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_technique_cat', 'TECHNIQUE', 'CAT', 'Cắt', ARRAY['cutting']::TEXT[], 90, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_technique_kiem_hang', 'TECHNIQUE', 'KIEM_HANG', 'Kiểm hàng', ARRAY['QC']::TEXT[], 100, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_technique_dong_goi', 'TECHNIQUE', 'DONG_GOI', 'Đóng gói', ARRAY['packing']::TEXT[], 110, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_industry_doanh_nghiep', 'INDUSTRY', 'DOANH_NGHIEP', 'Doanh nghiệp', ARRAY['corporate']::TEXT[], 10, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_industry_ban_le', 'INDUSTRY', 'BAN_LE', 'Bán lẻ', ARRAY['retail']::TEXT[], 20, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_industry_fb', 'INDUSTRY', 'FB', 'F&B', ARRAY['food and beverage']::TEXT[], 30, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_industry_giao_duc', 'INDUSTRY', 'GIAO_DUC', 'Giáo dục', ARRAY['education']::TEXT[], 40, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_industry_y_te', 'INDUSTRY', 'Y_TE', 'Y tế', ARRAY['healthcare', 'hospital']::TEXT[], 50, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_industry_ngan_hang', 'INDUSTRY', 'NGAN_HANG', 'Ngân hàng', ARRAY['banking']::TEXT[], 60, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_industry_bat_dong_san', 'INDUSTRY', 'BAT_DONG_SAN', 'Bất động sản', ARRAY['real estate']::TEXT[], 70, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_industry_cong_nghe', 'INDUSTRY', 'CONG_NGHE', 'Công nghệ', ARRAY['tech']::TEXT[], 80, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_industry_su_kien', 'INDUSTRY', 'SU_KIEN', 'Sự kiện', ARRAY['event']::TEXT[], 90, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_industry_giai_tri', 'INDUSTRY', 'GIAI_TRI', 'Giải trí', ARRAY['entertainment']::TEXT[], 100, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_industry_the_thao', 'INDUSTRY', 'THE_THAO', 'Thể thao', ARRAY['sports']::TEXT[], 110, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_industry_du_lich', 'INDUSTRY', 'DU_LICH', 'Du lịch', ARRAY['tourism']::TEXT[], 120, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_industry_nha_hang', 'INDUSTRY', 'NHA_HANG', 'Nhà hàng', ARRAY['restaurant']::TEXT[], 130, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_industry_khach_san', 'INDUSTRY', 'KHACH_SAN', 'Khách sạn', ARRAY['hotel']::TEXT[], 140, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_industry_san_xuat', 'INDUSTRY', 'SAN_XUAT', 'Sản xuất', ARRAY['manufacturing']::TEXT[], 150, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_audience_nam', 'AUDIENCE', 'NAM', 'Nam', ARRAY['men']::TEXT[], 10, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_audience_nu', 'AUDIENCE', 'NU', 'Nữ', ARRAY['women']::TEXT[], 20, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_audience_unisex', 'AUDIENCE', 'UNISEX', 'Unisex', ARRAY[]::TEXT[], 30, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_audience_tre_em', 'AUDIENCE', 'TRE_EM', 'Trẻ em', ARRAY['kids']::TEXT[], 40, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_audience_nhan_vien', 'AUDIENCE', 'NHAN_VIEN', 'Nhân viên', ARRAY['staff', 'employee']::TEXT[], 50, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_audience_cong_nhan', 'AUDIENCE', 'CONG_NHAN', 'Công nhân', ARRAY['worker']::TEXT[], 60, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_audience_khach_hang', 'AUDIENCE', 'KHACH_HANG', 'Khách hàng', ARRAY['customer']::TEXT[], 70, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_audience_dai_ly', 'AUDIENCE', 'DAI_LY', 'Đại lý', ARRAY['dealer', 'agent']::TEXT[], 80, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_audience_doanh_nghiep', 'AUDIENCE', 'DOANH_NGHIEP', 'Doanh nghiệp', ARRAY['enterprise']::TEXT[], 90, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_use_case_dong_phuc_cong_ty', 'USE_CASE', 'DONG_PHUC_CONG_TY', 'Đồng phục công ty', ARRAY['company uniform']::TEXT[], 10, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_use_case_dong_phuc_su_kien', 'USE_CASE', 'DONG_PHUC_SU_KIEN', 'Đồng phục sự kiện', ARRAY['event uniform']::TEXT[], 20, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_use_case_merchandise', 'USE_CASE', 'MERCHANDISE', 'Merchandise', ARRAY['merch']::TEXT[], 30, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_use_case_qua_tang_khach_hang', 'USE_CASE', 'QUA_TANG_KHACH_HANG', 'Quà tặng khách hàng', ARRAY['customer gift']::TEXT[], 40, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_use_case_qua_tang_nhan_vien', 'USE_CASE', 'QUA_TANG_NHAN_VIEN', 'Quà tặng nhân viên', ARRAY['staff gift']::TEXT[], 50, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_use_case_team_building', 'USE_CASE', 'TEAM_BUILDING', 'Team building', ARRAY[]::TEXT[], 60, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_use_case_ra_mat_san_pham', 'USE_CASE', 'RA_MAT_SAN_PHAM', 'Ra mắt sản phẩm', ARRAY['product launch']::TEXT[], 70, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_use_case_concert', 'USE_CASE', 'CONCERT', 'Concert', ARRAY[]::TEXT[], 80, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_use_case_ban_le', 'USE_CASE', 'BAN_LE', 'Bán lẻ', ARRAY['retail']::TEXT[], 90, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_use_case_noi_dung_seo', 'USE_CASE', 'NOI_DUNG_SEO', 'Nội dung SEO', ARRAY['SEO content']::TEXT[], 100, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_use_case_landing_page', 'USE_CASE', 'LANDING_PAGE', 'Landing page', ARRAY[]::TEXT[], 110, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_use_case_trang_chu', 'USE_CASE', 'TRANG_CHU', 'Trang chủ', ARRAY['homepage']::TEXT[], 120, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_use_case_social_media', 'USE_CASE', 'SOCIAL_MEDIA', 'Social media', ARRAY['mạng xã hội']::TEXT[], 130, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_use_case_catalogue_san_pham', 'USE_CASE', 'CATALOGUE_SAN_PHAM', 'Catalogue sản phẩm', ARRAY['catalog']::TEXT[], 140, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mvt_use_case_ho_so_nang_luc', 'USE_CASE', 'HO_SO_NANG_LUC', 'Hồ sơ năng lực', ARRAY['company profile']::TEXT[], 150, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("type", "name") DO NOTHING;

-- Lightweight base SEO score backfill (full formula via media:recalculate-intelligence)
UPDATE "MediaAsset" SET
  "seoScore" = LEAST(100, GREATEST(0,
    (CASE WHEN "libraryId" IS NOT NULL THEN 5 ELSE 0 END) +
    (CASE WHEN "roleId" IS NOT NULL THEN 5 ELSE 0 END) +
    (CASE WHEN "visibility" = 'PUBLIC' THEN 5 ELSE 0 END) +
    2 +
    (CASE WHEN "title" IS NOT NULL AND btrim("title") <> '' THEN 10 ELSE 0 END) +
    (CASE WHEN "altText" IS NOT NULL AND btrim("altText") <> '' THEN 15 ELSE 0 END) +
    (CASE WHEN "caption" IS NOT NULL AND btrim("caption") <> '' THEN 8 ELSE 0 END) +
    (CASE WHEN "description" IS NOT NULL AND btrim("description") <> '' THEN 8 ELSE 0 END) +
    (CASE WHEN cardinality("tags") > 0 THEN 5 ELSE 0 END) +
    (CASE WHEN cardinality("keywords") > 0 THEN 10 ELSE 0 END) +
    (CASE WHEN "orientation" IS NOT NULL AND "orientation" <> 'UNKNOWN' THEN 2 ELSE 0 END) +
    (CASE WHEN "width" IS NOT NULL AND "height" IS NOT NULL THEN 2 ELSE 0 END) +
    (CASE WHEN "contentLanguage" IS NOT NULL AND btrim("contentLanguage") <> '' THEN 3 ELSE 0 END) +
    (CASE WHEN "duplicateStatus" IS DISTINCT FROM 'POSSIBLE_DUPLICATE' THEN 3 ELSE 0 END)
  )),
  "metadataCompleteness" = LEAST(100, (
    (CASE WHEN "libraryId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "roleId" IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN "altText" IS NOT NULL AND btrim("altText") <> '' THEN 1 ELSE 0 END) +
    (CASE WHEN "title" IS NOT NULL AND btrim("title") <> '' THEN 1 ELSE 0 END) +
    (CASE WHEN "caption" IS NOT NULL AND btrim("caption") <> '' THEN 1 ELSE 0 END) +
    (CASE WHEN "description" IS NOT NULL AND btrim("description") <> '' THEN 1 ELSE 0 END) +
    (CASE WHEN cardinality("keywords") > 0 THEN 1 ELSE 0 END) +
    (CASE WHEN "orientation" IS NOT NULL AND "orientation" <> 'UNKNOWN' THEN 1 ELSE 0 END) +
    (CASE WHEN "width" IS NOT NULL AND "height" IS NOT NULL THEN 1 ELSE 0 END)
  ) * 100 / 12);

UPDATE "MediaAsset" SET "seoReadinessStatus" = CASE
  WHEN "seoScore" >= 85 THEN 'EXCELLENT'::"MediaSeoReadinessStatus"
  WHEN "seoScore" >= 65 THEN 'READY'::"MediaSeoReadinessStatus"
  WHEN "seoScore" >= 40 THEN 'BASIC'::"MediaSeoReadinessStatus"
  ELSE 'INCOMPLETE'::"MediaSeoReadinessStatus"
END;

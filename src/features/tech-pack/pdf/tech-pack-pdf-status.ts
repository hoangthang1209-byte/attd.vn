import type { TechPackStatus } from "@prisma/client";

export type TechPackPdfWatermark = {
  label: string | null;
  cssClass: string | null;
  headerBadge: string | null;
};

export function resolveTechPackPdfWatermark(
  status: TechPackStatus,
): TechPackPdfWatermark {
  switch (status) {
    case "DRAFT":
      return {
        label: "BẢN NHÁP — CHƯA PHÁT HÀNH",
        cssClass: "tp-watermark--draft",
        headerBadge: "BẢN NHÁP",
      };
    case "RELEASED":
      return {
        label: null,
        cssClass: null,
        headerBadge: "ĐÃ PHÁT HÀNH",
      };
    case "SUPERSEDED":
      return {
        label: "ĐÃ BỊ THAY THẾ",
        cssClass: "tp-watermark--superseded",
        headerBadge: "ĐÃ BỊ THAY THẾ",
      };
    default:
      return { label: null, cssClass: null, headerBadge: null };
  }
}

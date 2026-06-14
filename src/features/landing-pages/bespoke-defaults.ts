import { CTA } from "@/lib/ctaConfig";
import { companyInfo } from "@/lib/companyInfo";
import type { BespokeLandingDefaults, LandingPageSlug } from "@/features/landing-pages/types";

export const BESPOKE_LANDING_DEFAULTS: Record<
  Extract<LandingPageSlug, "dai-ly" | "nguon-hang" | "oem" | "qua-tang-doanh-nghiep">,
  BespokeLandingDefaults
> = {
  "dai-ly": {
    title: "Đăng ký đại lý",
    metaTitle: "Đăng ký đại lý | ATTD",
    metaDescription:
      "Trở thành đại lý ATTD để nhận chính sách giá sỉ tốt nhất, nguồn hàng ổn định và hỗ trợ kinh doanh toàn diện.",
    heroTitle: "Trở thành đại lý ATTD",
    heroDescription:
      "Nguồn hàng đồng phục và quà tặng doanh nghiệp dành cho đại lý, xưởng in và doanh nghiệp trên toàn quốc. Đăng ký để nhận chính sách giá và hỗ trợ tốt nhất.",
    seoContent: "",
    faq: [],
    primaryCtaLabel: CTA.primary.label,
    primaryCtaHref: CTA.primary.href,
    secondaryCtaLabel: CTA.secondary.label,
    secondaryCtaHref: CTA.secondary.href,
  },
  "nguon-hang": {
    title: "Nguồn hàng sỉ",
    metaTitle: "Nguồn hàng sỉ | ATTD",
    metaDescription:
      "Kho nguồn hàng sỉ đồng phục trơn cho đại lý và xưởng in toàn quốc. Áo thun, polo, tote bag, nón — hàng có sẵn, giá sỉ tận kho, giao nhanh.",
    heroTitle: "Nguồn hàng sỉ đồng phục trơn cho đại lý và xưởng in",
    heroDescription:
      "ATTD là kho sỉ B2B chuyên cung cấp áo thun, polo, tote bag và nón trơn chất lượng cao. Hàng sẵn kho, giao nhanh toàn quốc.",
    seoContent: "",
    faq: [],
    primaryCtaLabel: "Đăng ký đại lý",
    primaryCtaHref: "/dai-ly",
    secondaryCtaLabel: "Chat Zalo",
    secondaryCtaHref: companyInfo.zalo.url,
  },
  oem: {
    title: "OEM & Private Label",
    metaTitle: "OEM & Private Label | ATTD",
    metaDescription:
      "ATTD cung cấp sản phẩm trơn cho OEM và Private Label. Hàng trơn chất lượng cao, nhiều màu, nhiều size, sẵn kho, phù hợp gắn nhãn riêng cho thương hiệu của bạn.",
    heroTitle: "OEM & Private Label cho thương hiệu của bạn",
    heroDescription:
      "ATTD cung cấp sản phẩm trơn chất lượng cao — áo thun, polo, tote bag, nón — sẵn kho, hỗ trợ gắn nhãn thương hiệu và đóng gói theo yêu cầu.",
    seoContent: "",
    faq: [
      {
        question: "OEM tại ATTD có nghĩa là gì?",
        answer:
          "ATTD cung cấp sản phẩm trơn (blank apparel) phù hợp cho các thương hiệu muốn gắn nhãn riêng. Chúng tôi không cung cấp dịch vụ in ấn — ATTD là nhà cung cấp nguồn hàng.",
      },
      {
        question: "Số lượng tối thiểu (MOQ) là bao nhiêu?",
        answer:
          "MOQ phụ thuộc vào từng dòng sản phẩm. Liên hệ để được tư vấn cụ thể theo nhu cầu.",
      },
      {
        question: "Có thể yêu cầu màu riêng không?",
        answer:
          "ATTD cung cấp theo bảng màu có sẵn. Với đơn hàng lớn, có thể tư vấn thêm phương án.",
      },
      {
        question: "Thời gian giao hàng bao lâu?",
        answer:
          "Hàng có sẵn kho: 2–5 ngày làm việc toàn quốc. Đơn có gắn nhãn: theo thoả thuận.",
      },
    ],
    primaryCtaLabel: CTA.primary.label,
    primaryCtaHref: CTA.primary.href,
    secondaryCtaLabel: CTA.secondary.label,
    secondaryCtaHref: CTA.secondary.href,
  },
  "qua-tang-doanh-nghiep": {
    title: "Quà tặng doanh nghiệp",
    metaTitle: "Quà tặng doanh nghiệp | ATTD",
    metaDescription:
      "Nguồn hàng quà tặng doanh nghiệp B2B: áo thun, polo, tote bag, nón và phụ kiện. Số lượng linh hoạt, giao nhanh toàn quốc, hỗ trợ gắn nhãn thương hiệu.",
    heroTitle: "Nguồn hàng quà tặng doanh nghiệp B2B",
    heroDescription:
      "Quà tặng doanh nghiệp từ nguồn hàng trơn chất lượng — áo thun, polo, tote bag, nón. Linh hoạt số lượng, giao nhanh toàn quốc.",
    seoContent: "",
    faq: [],
    primaryCtaLabel: "Nhận báo giá",
    primaryCtaHref: "/lien-he",
    secondaryCtaLabel: "Chat Zalo",
    secondaryCtaHref: companyInfo.zalo.url,
  },
};

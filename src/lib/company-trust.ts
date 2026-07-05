/**
 * Verified company trust facts — only include information confirmed by the business.
 * Do not add invented statistics, logos, or testimonials here.
 */

import type { CompanyInfoData } from "@/features/settings/services/settings.service";
import { hasCompanyField } from "@/lib/companyInfo";

export const VERIFIED_EXPERIENCE_YEARS = 14;

export type CompanyFact = {
  id: string;
  title: string;
  description: string;
};

/** Core company facts suitable for homepage and about page strips. */
export const COMPANY_FACTS: readonly CompanyFact[] = [
  {
    id: "experience",
    title: `${VERIFIED_EXPERIENCE_YEARS}+ năm kinh nghiệm`,
    description:
      "Phát triển từ nền tảng AOTHUNTHONGDIEP và nguồn hàng VietnamClothing trong ngành may mặc và đồng phục.",
  },
  {
    id: "oem",
    title: "OEM / Private Label",
    description:
      "Hỗ trợ sản xuất và hoàn thiện theo thương hiệu riêng cho đại lý, xưởng in và doanh nghiệp.",
  },
  {
    id: "showroom",
    title: "Showroom & Kho hàng",
    description:
      "Showroom và kho hàng tại TP. Hồ Chí Minh. Vui lòng liên hệ trước khi ghé thăm.",
  },
  {
    id: "manufacturing",
    title: "Mạng lưới sản xuất",
    description:
      "Phối hợp sản xuất và gia công trên toàn quốc theo quy mô đơn hàng và yêu cầu triển khai.",
  },
] as const;

export type CompanyTimelineItem = {
  id: string;
  /** Omit or leave empty when the exact year is not verified. */
  year?: string;
  title: string;
  description: string;
};

export const COMPANY_TIMELINE: readonly CompanyTimelineItem[] = [
  {
    id: "origins",
    title: "Nền tảng AOTHUNTHONGDIEP",
    description:
      "Xây dựng kinh nghiệm cung ứng áo thun, đồng phục và nguồn hàng cho đối tác B2B.",
  },
  {
    id: "sourcing",
    title: "Nguồn hàng VietnamClothing",
    description:
      "Mở rộng năng lực sourcing, kho hàng và phối hợp sản xuất cho đại lý và xưởng in.",
  },
  {
    id: "attd",
    title: "Ra mắt ATTD.vn",
    description:
      "Nền tảng B2B giúp đại lý, agency và doanh nghiệp tiếp cận nguồn hàng, báo giá và triển khai đơn hàng rõ ràng hơn.",
  },
] as const;

export type WhyChooseItem = {
  id: string;
  title: string;
  description: string;
};

export const WHY_CHOOSE_ATTD: readonly WhyChooseItem[] = [
  {
    id: "experience",
    title: "Kinh nghiệm thực chiến",
    description: `Hơn ${VERIFIED_EXPERIENCE_YEARS} năm làm việc với đại lý, xưởng in và doanh nghiệp trong ngành may mặc.`,
  },
  {
    id: "catalog",
    title: "Danh mục B2B đầy đủ",
    description:
      "Đồng phục, phôi trơn, quà tặng doanh nghiệp và các hạng mục OEM theo nhu cầu triển khai.",
  },
  {
    id: "oem",
    title: "OEM / Private Label",
    description:
      "Tư vấn và phối hợp sản xuất theo thương hiệu, nhãn mác và đóng gói khi khách hàng yêu cầu.",
  },
  {
    id: "operations",
    title: "Showroom, kho & sản xuất",
    description:
      "Showroom và kho tại TP. Hồ Chí Minh, kết hợp mạng lưới sản xuất phù hợp quy mô đơn hàng.",
  },
  {
    id: "qc",
    title: "Kiểm soát chất lượng",
    description:
      "Quy trình kiểm tra và đối soát trước khi bàn giao theo tiêu chuẩn vận hành của ATTD.",
  },
  {
    id: "support",
    title: "Hỗ trợ báo giá & triển khai",
    description:
      "Đội ngũ tư vấn sản phẩm, số lượng, in/thêu và tiến độ giao hàng trong giờ làm việc.",
  },
] as const;

export function buildGoogleMapsSearchUrl(address: string): string | null {
  const trimmed = address.trim();
  if (!trimmed) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
}

export function getCompanyTrustHighlights(company: CompanyInfoData): string[] {
  const highlights: string[] = [];

  if (VERIFIED_EXPERIENCE_YEARS > 0) {
    highlights.push(`${VERIFIED_EXPERIENCE_YEARS}+ năm kinh nghiệm`);
  }
  highlights.push("OEM / Private Label");
  highlights.push("Showroom & Kho hàng");

  if (hasCompanyField(company.taxCode)) {
    highlights.push(`MST: ${company.taxCode}`);
  }

  return highlights;
}

import { getCategories } from "@/features/categories/services/category.service";
import SectionHeader from "@/components/public/SectionHeader";
import CategoryCard from "@/components/public/CategoryCard";
import ClusterLinkGrid from "@/components/public/ClusterLinkGrid";
import CTASection from "@/components/public/CTASection";
import HeroSection from "@/components/public/HeroSection";
import SocialProofSection from "@/components/public/SocialProofSection";
import SourcingProcessSection from "@/components/public/SourcingProcessSection";
import ClientLogoWall from "@/components/public/ClientLogoWall";
import CaseStudySection from "@/components/public/CaseStudySection";
import TrustBanner from "@/components/public/TrustBanner";
import {
  Shirt,
  CircleDot,
  HardHat,
  ShoppingBag,
  Thermometer,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "ao-thun-tron": Shirt,
  "ao-polo-tron": CircleDot,
  non: HardHat,
  tote: ShoppingBag,
  "binh-giu-nhiet": Thermometer,
};

const WHOLESALE_LINKS = [
  {
    href: "/kho-ao-thun-tron",
    title: "Kho áo thun trơn",
    desc: "Tồn kho đa màu, giao hàng toàn quốc cho đại lý và xưởng in",
  },
  {
    href: "/ao-thun-tron-si",
    title: "Áo thun trơn sỉ",
    desc: "Giá sỉ theo bậc, chính sách ưu đãi cho đại lý",
  },
  {
    href: "/nguon-hang-ao-thun-tron",
    title: "Nguồn hàng áo thun trơn",
    desc: "Nhà cung cấp trực tiếp cho xưởng in và agency",
  },
  {
    href: "/kho-ao-polo-tron",
    title: "Kho áo polo trơn",
    desc: "Polo trơn sẵn kho, phù hợp đồng phục doanh nghiệp",
  },
  {
    href: "/ao-polo-tron-si",
    title: "Áo polo trơn sỉ",
    desc: "Giá sỉ cạnh tranh, hỗ trợ thêu logo theo yêu cầu",
  },
];

const KNOWLEDGE_LINKS = [
  {
    href: "/bang-mau-ao-thun-tron",
    title: "Bảng màu áo thun trơn",
    desc: "Hướng dẫn chọn màu đồng phục và tips in ấn",
  },
  {
    href: "/size-ao-thun-tron",
    title: "Size áo thun trơn",
    desc: "Bảng size chuẩn và hướng dẫn đặt hàng đúng size",
  },
  {
    href: "/vai-cotton-2-chieu",
    title: "Vải cotton 2 chiều",
    desc: "Đặc điểm, ưu nhược điểm và ứng dụng",
  },
  {
    href: "/vai-cvc-la-gi",
    title: "Vải CVC là gì?",
    desc: "So sánh CVC với cotton và TC chi tiết",
  },
  {
    href: "/vai-tc-la-gi",
    title: "Vải TC là gì?",
    desc: "Thành phần, ưu nhược điểm và khi nào nên dùng",
  },
];

export default async function HomePage() {
  const categories = await getCategories();

  return (
    <main>
      <HeroSection />
      <SocialProofSection />
      <SourcingProcessSection />

      <section className="section-alt section-compact">
        <div className="container">
          <SectionHeader
            title="Danh mục nổi bật"
            description="Blank apparel và quà tặng doanh nghiệp — nguồn hàng cho đại lý và xưởng gia công."
          />
          <div className="category-grid">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                name={category.name}
                slug={category.slug}
                icon={CATEGORY_ICONS[category.slug]}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="section-compact">
        <div className="container">
          <SectionHeader
            title="Kho hàng & nguồn hàng"
            description="Tìm hiểu chi tiết về kho hàng, giá sỉ và nguồn cung cấp cho đại lý, xưởng in và doanh nghiệp."
          />
          <ClusterLinkGrid links={WHOLESALE_LINKS} />
        </div>
      </section>

      <section className="section-alt section-compact">
        <div className="container">
          <SectionHeader
            title="Kiến thức áo thun"
            description="Hướng dẫn chọn màu sắc, size và chất liệu vải cho đại lý và xưởng in."
          />
          <ClusterLinkGrid links={KNOWLEDGE_LINKS} />
        </div>
      </section>

      <ClientLogoWall />
      <CaseStudySection />
      <TrustBanner />
      <CTASection />
    </main>
  );
}

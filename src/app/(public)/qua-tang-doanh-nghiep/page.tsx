import type { Metadata } from "next";
import BusinessSolutionPageV7 from "@/components/public/v7/BusinessSolutionPageV7";
import DealerLeadForm from "@/components/forms/DealerLeadForm";
import FaqSchema from "@/components/seo/FaqSchema";
import { getPublicSurfaceMedia } from "@/features/media/public-surface-media";
import { resolveBespokeLanding } from "@/features/landing-pages/resolve-bespoke-landing";
import { canonicalUrl, buildOgImages } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const landing = await resolveBespokeLanding("qua-tang-doanh-nghiep");
  return {
    title: landing.metaTitle,
    description: landing.metaDescription,
    alternates: { canonical: canonicalUrl("/qua-tang-doanh-nghiep") },
    openGraph: {
      title: landing.metaTitle,
      description: landing.metaDescription,
      images: buildOgImages(),
    },
  };
}

export default async function CorporateGiftPage() {
  const [media, landing] = await Promise.all([
    getPublicSurfaceMedia("corporateGift"),
    resolveBespokeLanding("qua-tang-doanh-nghiep"),
  ]);

  return (
    <>
      {landing.faq.length > 0 ? <FaqSchema items={landing.faq} /> : null}
      <BusinessSolutionPageV7
        kicker="Quà tặng doanh nghiệp"
        title="Làm quà tặng doanh nghiệp theo đúng ngân sách và mục tiêu chương trình."
        lead="ATTD giúp chọn sản phẩm, phối thành bộ, in logo, làm bao bì và đóng gói theo ngân sách, số lượng và thời gian cần hàng."
        audience="Marketing · Nhân sự · Bộ phận mua hàng · Agency"
        promise="Chọn sản phẩm · In logo · Đóng bộ · Giao hàng"
        media={media}
        capabilities={[
          { title: "Lên phương án quà tặng", description: "Chọn sản phẩm và cách phối bộ theo người nhận, ngân sách và mục tiêu chương trình." },
          { title: "Kết hợp nhiều nhóm sản phẩm", description: "Phối áo, túi, nón, bình, phụ kiện và các sản phẩm phù hợp thành một bộ quà tặng." },
          { title: "In logo & bao bì", description: "In/thêu, hộp, thiệp, nhãn và bao bì đồng bộ nhận diện thương hiệu." },
          { title: "Đóng bộ & chia điểm giao", description: "Đóng gói theo từng bộ, chia đợt và chuẩn bị giao theo danh sách hoặc nhiều địa điểm." },
        ]}
        outcomes={[
          "Danh mục quà tặng phù hợp ngân sách",
          "Hình ảnh và nhận diện thương hiệu thống nhất",
          "Đóng gói theo từng bộ hoặc từng nhóm người nhận",
          "Tiến độ phù hợp thời gian của chương trình/sự kiện",
        ]}
        process={[
          { title: "Gửi nhu cầu", description: "Đối tượng nhận, ngân sách, số lượng và mục tiêu chương trình." },
          { title: "Đề xuất quà tặng", description: "ATTD đề xuất các sản phẩm và cách phối thành bộ phù hợp." },
          { title: "Duyệt mẫu", description: "Duyệt sản phẩm, logo, bao bì và cách đóng bộ." },
          { title: "Sản xuất & đóng gói", description: "Hoàn thiện sản phẩm và đóng gói theo phương án đã duyệt." },
          { title: "Giao hàng", description: "Giao một điểm hoặc chia thành nhiều đợt theo kế hoạch." },
        ]}
        ctaLabel="Nhận tư vấn quà tặng"
        seoContent={landing.seoContent}
        leadCapture={<DealerLeadForm source="CORPORATE_GIFTS_PAGE" title="Nhận báo giá quà tặng" />}
      />
    </>
  );
}

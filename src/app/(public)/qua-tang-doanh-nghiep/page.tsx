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
        title="Quà tặng không phải một món hàng. Đó là một trải nghiệm thương hiệu."
        lead="ATTD xây bộ quà tặng theo mục tiêu chiến dịch, ngân sách, số lượng và cách bàn giao — từ sourcing đến branding và packaging."
        audience="Marketing · HR · Procurement · Agency"
        promise="Sourcing · Branding · Gift set · Fulfillment"
        media={media}
        capabilities={[
          { title: "Gift architecture", description: "Xây cấu trúc bộ quà theo người nhận, ngân sách và mục tiêu chiến dịch." },
          { title: "Multi-category sourcing", description: "Kết hợp apparel, túi, nón, bình, phụ kiện và các sản phẩm sourced khác." },
          { title: "Branding & packaging", description: "In/thêu, sleeve, hộp, thiệp, nhãn và packaging đồng bộ nhận diện." },
          { title: "Packing & allocation", description: "Đóng bộ, chia batch và chuẩn bị giao theo danh sách hoặc nhiều điểm." },
        ]}
        outcomes={[
          "Danh mục quà tặng phù hợp ngân sách",
          "Visual và branding thống nhất",
          "Packing theo từng set hoặc từng nhóm người nhận",
          "Timeline đáp ứng campaign/event deadline",
        ]}
        process={[
          { title: "Campaign brief", description: "Đối tượng nhận, ngân sách, số lượng và mục tiêu chương trình." },
          { title: "Curate", description: "ATTD đề xuất cấu trúc gift set và lựa chọn sản phẩm." },
          { title: "Sample & approve", description: "Duyệt mẫu, logo, packaging và cách đóng bộ." },
          { title: "Produce & pack", description: "Hoàn thiện sản phẩm và đóng gói theo cấu hình." },
          { title: "Deliver", description: "Giao một điểm hoặc chia theo batch theo kế hoạch." },
        ]}
        ctaLabel="Tư vấn gift project"
        seoContent={landing.seoContent}
        leadCapture={<DealerLeadForm source="CORPORATE_GIFTS_PAGE" title="Nhận báo giá quà tặng" />}
      />
    </>
  );
}

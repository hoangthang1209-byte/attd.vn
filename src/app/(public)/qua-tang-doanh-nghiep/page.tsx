import type { Metadata } from "next";
import BusinessSolutionPageV7 from "@/components/public/v7/BusinessSolutionPageV7";
import { getPublicSurfaceMedia } from "@/features/media/public-surface-media";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Quà tặng doanh nghiệp | ATTD",
  description: "Corporate gifts, gift set, apparel, túi, nón, bình và packaging theo chiến dịch doanh nghiệp.",
};

export default async function CorporateGiftPage() {
  const media = await getPublicSurfaceMedia("corporateGift");
  return (
    <BusinessSolutionPageV7
      kicker="Corporate Gifts"
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
    />
  );
}

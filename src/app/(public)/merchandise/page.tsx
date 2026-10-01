import type { Metadata } from "next";
import BusinessSolutionPageV7 from "@/components/public/v7/BusinessSolutionPageV7";
import { getPublicSurfaceMedia } from "@/features/media/public-surface-media";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Artist & Event Merchandise Partner | ATTD",
  description: "Đối tác phát triển và sản xuất merchandise cho nghệ sĩ, concert, entertainment agency và event: multi-SKU, sample, production, QC, packing và delivery.",
};

export default async function MerchandisePage() {
  const media = await getPublicSurfaceMedia("merchandise");
  return (
    <BusinessSolutionPageV7
      kicker="Artist & Event Merchandise"
      title="Merchandise từ concept đến production — cho những deadline không được phép trễ."
      lead="ATTD hợp tác cùng agency, promoter và đơn vị sở hữu thương hiệu để phát triển, sản xuất và hoàn thiện merchandise nhiều SKU cho concert, fan event và campaign quy mô lớn."
      audience="Entertainment agency · Promoter · Artist team · Brand"
      promise="Multi-SKU · Sampling · Bulk production · QC · Packing"
      media={media}
      capabilities={[
        { title: "Collection development", description: "Phát triển apparel, nón, bandana, tote và phụ kiện thành một collection đồng bộ." },
        { title: "Approval management", description: "Quản lý vòng duyệt sample, artwork, Pantone, placement, label và packaging." },
        { title: "Scale production", description: "Điều phối nhiều SKU, nhiều công đoạn và batch sản xuất trong cùng timeline." },
        { title: "Event fulfillment", description: "QC, sort size/SKU, đóng gói và phân bổ giao hàng theo venue hoặc distributor." },
      ]}
      outcomes={[
        "Master merchandise plan theo SKU và quantity",
        "Sample approval trước mass production",
        "Tracking tiến độ theo SKU/batch",
        "QC và packing phù hợp retail/event distribution",
        "Một đầu mối điều phối toàn bộ collection",
      ]}
      process={[
        { title: "Master brief", description: "Collection concept, artwork, SKU list, quantity và event date." },
        { title: "Development", description: "Material sourcing, technical setup và prototype/sample." },
        { title: "Approval", description: "Chốt fit, màu, artwork, label, packaging và master sample." },
        { title: "Mass production", description: "Triển khai theo SKU/batch với checkpoint tiến độ." },
        { title: "QC & fulfillment", description: "Kiểm, sort, pack và giao theo kế hoạch sự kiện." },
      ]}
      ctaLabel="Trao đổi merchandise project"
    />
  );
}

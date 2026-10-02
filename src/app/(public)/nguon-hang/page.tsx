import type { Metadata } from "next";
import BusinessSolutionPageV7 from "@/components/public/v7/BusinessSolutionPageV7";
import DealerLeadForm from "@/components/forms/DealerLeadForm";
import FaqSchema from "@/components/seo/FaqSchema";
import { getPublicSurfaceMedia } from "@/features/media/public-surface-media";
import { resolveBespokeLanding } from "@/features/landing-pages/resolve-bespoke-landing";
import { canonicalUrl, buildOgImages } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const landing = await resolveBespokeLanding("nguon-hang");
  return {
    title: landing.metaTitle,
    description: landing.metaDescription,
    alternates: { canonical: canonicalUrl("/nguon-hang") },
    openGraph: {
      title: landing.metaTitle,
      description: landing.metaDescription,
      images: buildOgImages(),
    },
  };
}

export default async function SourcingPage() {
  const [media, landing] = await Promise.all([
    getPublicSurfaceMedia("sourcing"),
    resolveBespokeLanding("nguon-hang"),
  ]);

  return (
    <>
      {landing.faq.length > 0 ? <FaqSchema items={landing.faq} /> : null}
      <BusinessSolutionPageV7
        kicker="Nguồn hàng B2B"
        title="Tìm nguồn hàng phù hợp để bạn báo giá và triển khai đơn nhanh hơn."
        lead="ATTD cung cấp áo, nón, túi, quà tặng và nhiều nhóm hàng khác cho đại lý, agency, xưởng in và doanh nghiệp, kèm thông tin số lượng tối thiểu, thời gian và khả năng hoàn thiện."
        audience="Đại lý · Agency · Xưởng in · Bộ phận mua hàng"
        promise="Tìm hàng · Số lượng tối thiểu · In/thêu · Giao hàng"
        media={media}
        capabilities={[
          { title: "Danh mục nguồn hàng", description: "Áo thun, polo, nón, tote, quà tặng và các nhóm sản phẩm có thể mở rộng theo nhu cầu." },
          { title: "Tồn kho & số lượng", description: "Tư vấn phương án phù hợp giữa hàng có sẵn, đặt theo đợt và sản xuất bổ sung." },
          { title: "Hoàn thiện thương hiệu", description: "In, thêu, nhãn, packaging và các công đoạn hoàn thiện trước khi giao." },
          { title: "Hỗ trợ báo giá", description: "Cung cấp hình ảnh, thông tin sản phẩm và tư vấn lựa chọn để đại lý/agency báo giá nhanh hơn." },
        ]}
        outcomes={[
          "Nguồn hàng phù hợp mức giá và số lượng",
          "Thông tin số lượng tối thiểu, thời gian và khả năng hoàn thiện rõ ràng",
          "Một đầu mối cho cả hàng hóa và in/thêu",
          "Có thể chuyển sang làm OEM khi dự án cần sản phẩm riêng",
        ]}
        process={[
          { title: "Gửi nhu cầu", description: "Nhóm sản phẩm, số lượng, ngân sách và deadline." },
          { title: "ATTD đề xuất nguồn hàng", description: "So sánh các lựa chọn hàng có sẵn, đặt theo đợt hoặc làm riêng." },
          { title: "Chốt cấu hình", description: "Sản phẩm, màu, size, logo và cách hoàn thiện." },
          { title: "Báo giá & triển khai", description: "Chốt giá, tiến độ và kế hoạch giao hàng." },
        ]}
        ctaLabel="Nhận tư vấn nguồn hàng"
        seoContent={landing.seoContent}
        leadCapture={<DealerLeadForm source="WHOLESALE_PAGE" title="Nhận báo giá sỉ" />}
      />
    </>
  );
}

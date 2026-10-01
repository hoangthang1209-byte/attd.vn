import type { Metadata } from "next";
import BusinessSolutionPageV7 from "@/components/public/v7/BusinessSolutionPageV7";
import DealerLeadForm from "@/components/forms/DealerLeadForm";
import FaqSchema from "@/components/seo/FaqSchema";
import { getPublicSurfaceMedia } from "@/features/media/public-surface-media";
import { resolveBespokeLanding } from "@/features/landing-pages/resolve-bespoke-landing";
import { canonicalUrl, buildOgImages } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const landing = await resolveBespokeLanding("oem");
  return {
    title: landing.metaTitle,
    description: landing.metaDescription,
    alternates: { canonical: canonicalUrl("/oem") },
    openGraph: {
      title: landing.metaTitle,
      description: landing.metaDescription,
      images: buildOgImages(),
    },
  };
}

export default async function OemPage() {
  const [media, landing] = await Promise.all([
    getPublicSurfaceMedia("oem"),
    resolveBespokeLanding("oem"),
  ]);

  return (
    <>
      {landing.faq.length > 0 ? <FaqSchema items={landing.faq} /> : null}
      <BusinessSolutionPageV7
        kicker="OEM / Private Label"
        title="Làm sản phẩm riêng theo đúng yêu cầu của thương hiệu."
        lead="ATTD đồng hành từ ý tưởng ban đầu, chọn chất liệu, làm mẫu và tính giá đến sản xuất số lượng lớn, kiểm hàng và đóng gói."
        audience="Thương hiệu · Agency · Doanh nghiệp · Dự án merchandise"
        promise="Phát triển mẫu · Sản xuất · Kiểm hàng · Đóng gói"
        media={media}
        capabilities={[
          { title: "Phát triển sản phẩm", description: "Phân tích mẫu, form, cấu trúc, chất liệu, định lượng, màu và các chi tiết kỹ thuật." },
          { title: "Làm mẫu", description: "Làm mẫu trước khi sản xuất số lượng lớn để duyệt form, màu, hình in/thêu, nhãn và bao bì." },
          { title: "Nhãn & bao bì thương hiệu", description: "Nhãn dệt, nhãn ép nhiệt, thẻ treo, túi, hộp và các chi tiết nhận diện theo yêu cầu." },
          { title: "Điều phối sản xuất", description: "Phối hợp nhiều công đoạn và nhà cung cấp theo một kế hoạch tiến độ thống nhất." },
        ]}
        outcomes={[
          "Thông số và mẫu được duyệt trước khi sản xuất số lượng lớn",
          "Báo giá theo cấu hình thực tế",
          "Tiến độ và các mốc kiểm tra rõ ràng",
          "Kiểm hàng và đóng gói theo yêu cầu dự án",
        ]}
        process={[
          { title: "Gửi yêu cầu", description: "Hình tham khảo, thiết kế, ngân sách mục tiêu, số lượng và thời gian cần hàng." },
          { title: "Phát triển & làm mẫu", description: "Chọn vật liệu, cấu trúc và làm mẫu thử." },
          { title: "Duyệt mẫu", description: "Chốt thông số, màu, hình in/thêu, nhãn và bao bì." },
          { title: "Sản xuất hàng loạt", description: "Sản xuất theo từng đợt và các mốc kiểm tra đã thống nhất." },
          { title: "Kiểm hàng & giao", description: "Kiểm chất lượng, đóng gói và giao theo kế hoạch." },
        ]}
        ctaLabel="Nhận tư vấn OEM"
        seoContent={landing.seoContent}
        leadCapture={<DealerLeadForm source="OEM_PAGE" title="Nhận báo giá OEM" />}
      />
    </>
  );
}

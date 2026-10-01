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
        title="Xây sản phẩm của riêng bạn. Không chỉ gắn logo lên hàng có sẵn."
        lead="ATTD đồng hành từ brief sản phẩm đến sample, costing, duyệt thông số, sản xuất hàng loạt, QC và packaging."
        audience="Thương hiệu · Agency · Doanh nghiệp · Dự án merchandise"
        promise="Phát triển · Mẫu · Sản xuất · QC"
        media={media}
        capabilities={[
          { title: "Product development", description: "Phân tích mẫu, form, cấu trúc, chất liệu, GSM, màu và chi tiết kỹ thuật." },
          { title: "Sampling", description: "Làm mẫu trước bulk để duyệt fit, màu, artwork, nhãn và packaging." },
          { title: "Brand finishing", description: "Woven label, heat transfer, hangtag, polybag, hộp và các yêu cầu nhận diện." },
          { title: "Production orchestration", description: "Điều phối nhiều công đoạn và nhà cung cấp trong một timeline dự án." },
        ]}
        outcomes={[
          "Bộ thông số và mẫu được duyệt trước bulk",
          "Costing theo cấu hình thực tế",
          "Production timeline và checkpoint rõ ràng",
          "QC và packing theo chuẩn dự án",
        ]}
        process={[
          { title: "Product brief", description: "Reference, artwork, target cost, quantity và deadline." },
          { title: "Develop & sample", description: "Chọn vật liệu, cấu trúc và làm mẫu thử." },
          { title: "Approve", description: "Chốt thông số, màu, artwork, nhãn và packaging." },
          { title: "Bulk production", description: "Sản xuất theo batch và checkpoint đã thống nhất." },
          { title: "QC & delivery", description: "Kiểm hàng, đóng gói và giao theo kế hoạch." },
        ]}
        ctaLabel="Gửi brief OEM"
        seoContent={landing.seoContent}
        leadCapture={<DealerLeadForm source="OEM_PAGE" title="Nhận báo giá OEM" />}
      />
    </>
  );
}

import type { Metadata } from "next";
import BusinessSolutionPageV7 from "@/components/public/v7/BusinessSolutionPageV7";
import { getPublicSurfaceMedia } from "@/features/media/public-surface-media";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Đồng phục doanh nghiệp | ATTD",
  description: "Giải pháp đồng phục doanh nghiệp từ tư vấn mẫu, chất liệu, in/thêu, size set đến QC, đóng gói và giao hàng.",
};

export default async function UniformPage() {
  const media = await getPublicSurfaceMedia("uniform");
  return (
    <BusinessSolutionPageV7
      kicker="Corporate Uniform"
      title="Đồng phục được quản lý như một dự án, không phải một đơn áo."
      lead="ATTD đồng hành từ chọn mẫu, vật liệu, logo và size set đến sản xuất, QC, đóng gói và bàn giao theo deadline."
      audience="Doanh nghiệp · Trường học · Event · Chuỗi cửa hàng"
      promise="Tư vấn · In/thêu · Size set · QC · Delivery"
      media={media}
      capabilities={[
        { title: "Uniform planning", description: "Chọn kiểu sản phẩm và cấu hình theo môi trường sử dụng, ngân sách và nhận diện." },
        { title: "Material & fit", description: "Tư vấn chất liệu, GSM, form, màu và size set phù hợp đội ngũ." },
        { title: "Logo finishing", description: "In lụa, DTF, decal, thêu và các kỹ thuật phù hợp từng vị trí." },
        { title: "Rollout", description: "QC, đóng theo size/phòng ban và giao theo kế hoạch triển khai." },
      ]}
      outcomes={[
        "Mẫu và màu được duyệt trước sản xuất",
        "Size set và bảng phân bổ rõ ràng",
        "Logo/branding nhất quán trên toàn batch",
        "Đóng gói và bàn giao theo đơn vị/phòng ban nếu cần",
      ]}
      process={[
        { title: "Nhận brief", description: "Số lượng, bộ phận sử dụng, ngân sách, logo và deadline." },
        { title: "Đề xuất", description: "Mẫu, chất liệu, màu, kỹ thuật logo và mức giá phù hợp." },
        { title: "Sample & size", description: "Duyệt mẫu/logo và chốt size set." },
        { title: "Production", description: "Sản xuất và theo dõi tiến độ theo batch." },
        { title: "QC & handover", description: "Kiểm hàng, đóng gói và bàn giao." },
      ]}
      ctaLabel="Nhận tư vấn đồng phục"
    />
  );
}

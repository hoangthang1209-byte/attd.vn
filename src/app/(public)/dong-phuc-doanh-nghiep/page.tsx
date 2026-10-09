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
      kicker="Đồng phục doanh nghiệp"
      title="Làm đồng phục dễ hơn khi mọi việc đi qua một đầu mối."
      lead="ATTD hỗ trợ từ chọn mẫu, chất liệu, logo và chia size đến sản xuất, kiểm hàng, đóng gói và giao đúng kế hoạch."
      audience="Doanh nghiệp · Trường học · Sự kiện · Chuỗi cửa hàng"
      promise="Tư vấn · In/thêu · Chia size · Kiểm hàng · Giao hàng"
      media={media}
      capabilities={[
        { title: "Chọn mẫu phù hợp", description: "Chọn kiểu áo và cách hoàn thiện theo môi trường sử dụng, ngân sách và nhận diện." },
        { title: "Chất liệu & form dáng", description: "Tư vấn chất liệu, định lượng, form, màu và cách chia size phù hợp đội ngũ." },
        { title: "In & thêu logo", description: "Tư vấn kỹ thuật in/thêu phù hợp với chất liệu, vị trí và yêu cầu sử dụng." },
        { title: "Kiểm hàng & giao", description: "Kiểm chất lượng, đóng theo size/phòng ban và giao theo kế hoạch." },
      ]}
      outcomes={[
        "Mẫu và màu được duyệt trước sản xuất",
        "Bộ mẫu size và bảng phân bổ rõ ràng",
        "Logo và nhận diện thống nhất trong toàn bộ đơn hàng",
        "Đóng gói và bàn giao theo đơn vị/phòng ban nếu cần",
      ]}
      process={[
        { title: "Nhận nhu cầu", description: "Số lượng, người sử dụng, ngân sách, logo và thời gian cần hàng." },
        { title: "Đề xuất", description: "Mẫu, chất liệu, màu, kỹ thuật logo và mức giá phù hợp." },
        { title: "Duyệt mẫu & size", description: "Duyệt mẫu, logo và chốt cách chia size." },
        { title: "Sản xuất", description: "Triển khai sản xuất và theo dõi tiến độ theo từng đợt." },
        { title: "Kiểm hàng & bàn giao", description: "Kiểm chất lượng, đóng gói và bàn giao theo kế hoạch." },
      ]}
      ctaLabel="Nhận tư vấn đồng phục"
    />
  );
}

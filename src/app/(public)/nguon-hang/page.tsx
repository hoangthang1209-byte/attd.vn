import type { Metadata } from "next";
import BusinessSolutionPageV7 from "@/components/public/v7/BusinessSolutionPageV7";
import { getPublicSurfaceMedia } from "@/features/media/public-surface-media";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Nguồn hàng B2B | ATTD",
  description: "Nguồn hàng may mặc, đồng phục và quà tặng cho đại lý, agency và xưởng in. MOQ rõ, hỗ trợ in/thêu và giao hàng toàn quốc.",
};

export default async function SourcingPage() {
  const media = await getPublicSurfaceMedia("sourcing");
  return (
    <BusinessSolutionPageV7
      kicker="B2B Sourcing"
      title="Nguồn hàng để đội bán hàng của bạn đi nhanh hơn."
      lead="ATTD cung cấp hàng trơn và nhóm sản phẩm B2B cho đại lý, agency, xưởng in và doanh nghiệp — kèm dữ liệu sản phẩm, MOQ và khả năng hoàn thiện."
      audience="Đại lý · Agency · Xưởng in · Procurement"
      promise="Nguồn hàng · MOQ · In/thêu · Giao hàng"
      media={media}
      capabilities={[
        { title: "Danh mục nguồn hàng", description: "Áo thun, polo, nón, tote, quà tặng và các nhóm sản phẩm có thể mở rộng theo nhu cầu." },
        { title: "Tồn kho & MOQ", description: "Tư vấn phương án phù hợp giữa hàng có sẵn, đặt theo batch và sản xuất bổ sung." },
        { title: "Hoàn thiện thương hiệu", description: "In, thêu, nhãn, packaging và các công đoạn hoàn thiện trước khi giao." },
        { title: "Hỗ trợ bán hàng", description: "Hình ảnh, thông tin sản phẩm và tư vấn cấu hình để đại lý/agency báo giá nhanh hơn." },
      ]}
      outcomes={[
        "Nguồn hàng phù hợp mức giá và số lượng",
        "Thông tin MOQ, lead time và khả năng hoàn thiện rõ ràng",
        "Một đầu mối cho cả hàng hóa và in/thêu",
        "Khả năng mở rộng sang OEM khi dự án cần sản phẩm riêng",
      ]}
      process={[
        { title: "Gửi nhu cầu", description: "Nhóm sản phẩm, số lượng, ngân sách và deadline." },
        { title: "ATTD đề xuất nguồn", description: "So sánh các lựa chọn hàng sẵn, batch hoặc OEM." },
        { title: "Chốt cấu hình", description: "Sản phẩm, màu, size, logo và cách hoàn thiện." },
        { title: "Báo giá & triển khai", description: "Chốt cost, tiến độ và kế hoạch giao hàng." },
      ]}
      ctaLabel="Yêu cầu nguồn hàng"
    />
  );
}

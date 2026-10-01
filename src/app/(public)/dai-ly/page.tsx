import type { Metadata } from "next";
import BusinessSolutionPageV7 from "@/components/public/v7/BusinessSolutionPageV7";
import { getPublicSurfaceMedia } from "@/features/media/public-surface-media";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Hợp tác đại lý & agency | ATTD",
  description: "Hợp tác nguồn hàng B2B cùng ATTD cho đại lý đồng phục, agency quà tặng và xưởng in.",
};

export default async function DealerPage() {
  const media = await getPublicSurfaceMedia("dealer");
  return (
    <BusinessSolutionPageV7
      kicker="Dealer & Agency Partnership"
      title="ATTD đứng phía sau để đội sales của bạn bán nhanh hơn."
      lead="Dành cho đại lý, agency và xưởng in cần nguồn hàng ổn định, dữ liệu sản phẩm, hỗ trợ kỹ thuật và khả năng mở rộng sang OEM khi dự án yêu cầu."
      audience="Đại lý đồng phục · Agency · Xưởng in"
      promise="Nguồn hàng · Sales support · Fulfillment"
      media={media}
      capabilities={[
        { title: "Nguồn hàng", description: "Danh mục sản phẩm B2B phục vụ nhiều nhóm nhu cầu và mức số lượng." },
        { title: "Thông tin bán hàng", description: "Hình ảnh, chất liệu, MOQ, khả năng in/thêu và thông tin cần để báo giá." },
        { title: "Production backup", description: "Khi dự án vượt khỏi hàng có sẵn, ATTD có thể chuyển sang OEM hoặc phát triển riêng." },
        { title: "Fulfillment", description: "QC, hoàn thiện và giao hàng để đại lý tập trung vào sales và account management." },
      ]}
      outcomes={[
        "Giảm thời gian tìm nguồn cho mỗi lead",
        "Có một đầu mối xử lý cả sản phẩm và hoàn thiện",
        "Mở rộng danh mục mà không phải tự xây chuỗi cung ứng",
        "Có đường nâng cấp từ sourcing sang OEM",
      ]}
      process={[
        { title: "Onboard nhu cầu", description: "Nhóm sản phẩm, khách hàng mục tiêu và volume thường gặp." },
        { title: "Chọn danh mục", description: "ATTD đề xuất nhóm hàng phù hợp để bắt đầu." },
        { title: "Hỗ trợ quote", description: "Kiểm tra cấu hình, MOQ và phương án sản xuất." },
        { title: "Fulfill", description: "ATTD xử lý sourcing/production/QC theo từng đơn." },
      ]}
      ctaLabel="Trao đổi hợp tác"
    />
  );
}

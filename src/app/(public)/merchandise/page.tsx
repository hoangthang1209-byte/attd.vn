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
      title="Sản xuất merchandise cho nghệ sĩ và sự kiện, theo sát từ mẫu đến ngày giao."
      lead="ATTD phối hợp cùng agency, đơn vị tổ chức và đội ngũ thương hiệu để phát triển, sản xuất và hoàn thiện merchandise nhiều mẫu cho concert, fan event và các chiến dịch quy mô lớn."
      audience="Agency giải trí · Đơn vị tổ chức · Đội ngũ nghệ sĩ · Thương hiệu"
      promise="Nhiều mẫu · Làm mẫu · Sản xuất · Kiểm hàng · Đóng gói"
      media={media}
      capabilities={[
        { title: "Phát triển bộ merchandise", description: "Phát triển áo, nón, bandana, tote và phụ kiện thành một bộ sản phẩm đồng nhất." },
        { title: "Quản lý duyệt mẫu", description: "Theo dõi việc duyệt mẫu, thiết kế, màu Pantone, vị trí in/thêu, nhãn và bao bì." },
        { title: "Sản xuất nhiều mẫu cùng lúc", description: "Điều phối nhiều mẫu, nhiều công đoạn và nhiều đợt sản xuất trong cùng một kế hoạch." },
        { title: "Kiểm hàng & phân bổ", description: "Kiểm hàng, chia size/mẫu, đóng gói và giao theo địa điểm sự kiện hoặc đơn vị phân phối." },
      ]}
      outcomes={[
        "Kế hoạch tổng theo từng mẫu và số lượng",
        "Duyệt mẫu trước khi sản xuất số lượng lớn",
        "Theo dõi tiến độ theo từng mẫu và từng đợt",
        "Kiểm hàng và đóng gói phù hợp bán lẻ hoặc phân phối tại sự kiện",
        "Một đầu mối điều phối toàn bộ bộ sản phẩm",
      ]}
      process={[
        { title: "Gửi yêu cầu tổng", description: "Ý tưởng bộ sản phẩm, thiết kế, danh sách mẫu, số lượng và ngày diễn ra sự kiện." },
        { title: "Phát triển mẫu", description: "Chọn vật liệu, xử lý kỹ thuật và làm mẫu thử." },
        { title: "Duyệt mẫu", description: "Chốt form, màu, thiết kế, nhãn, bao bì và mẫu chuẩn." },
        { title: "Sản xuất số lượng lớn", description: "Triển khai theo từng mẫu và từng đợt với các mốc kiểm tra tiến độ." },
        { title: "Kiểm hàng & giao", description: "Kiểm hàng, phân loại, đóng gói và giao theo kế hoạch sự kiện." },
      ]}
      ctaLabel="Trao đổi dự án merchandise"
    />
  );
}

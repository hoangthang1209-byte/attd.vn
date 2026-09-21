import { PackageCheck } from "lucide-react";
import MarketplaceSectionHeader from "@/components/marketplace/MarketplaceSectionHeader";

const SOURCING_STEPS = [
  {
    title: "Chọn sản phẩm hoặc gửi yêu cầu",
    description: "Duyệt danh mục có sẵn hoặc mô tả nhu cầu nguồn hàng riêng.",
  },
  {
    title: "Kiểm tra tồn kho & MOQ",
    description: "ATTD rà soát khả năng cung ứng, số lượng tối thiểu và thời gian phù hợp.",
  },
  {
    title: "Tư vấn in/thêu/OEM",
    description: "Đề xuất phương án logo, nhãn, đóng gói hoặc sản xuất riêng khi cần.",
  },
  {
    title: "Chốt báo giá",
    description: "Báo giá theo số lượng, cấu hình sản phẩm và yêu cầu hoàn thiện.",
  },
  {
    title: "Giao hàng / sản xuất",
    description: "Triển khai giao hàng hoặc sản xuất theo tiến độ đã thống nhất.",
  },
];

export default function HomeSourcingFlowSection() {
  return (
    <section className="mp-section mp-section--alt mp-section--tight home-sourcing-flow">
      <div className="container">
        <MarketplaceSectionHeader
          title="Quy trình lấy nguồn hàng"
          description="Một luồng làm việc rõ ràng để đội mua hàng, đại lý và agency dễ kiểm soát yêu cầu, báo giá và tiến độ."
        />
        <ol className="home-sourcing-flow__list">
          {SOURCING_STEPS.map((step, i) => (
            <li key={step.title} className="home-sourcing-flow__item">
              <span className="home-sourcing-flow__num">{String(i + 1).padStart(2, "0")}</span>
              <span className="home-sourcing-flow__icon" aria-hidden>
                <PackageCheck size={18} />
              </span>
              <h3 className="home-sourcing-flow__title">{step.title}</h3>
              <p className="home-sourcing-flow__desc">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

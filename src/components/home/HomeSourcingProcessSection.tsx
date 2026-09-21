import MarketplaceSectionHeader from "@/components/marketplace/MarketplaceSectionHeader";
import { PackageCheck } from "lucide-react";

const SOURCING_STEPS = [
  {
    title: "Gửi yêu cầu hoặc chọn sản phẩm",
    description: "Duyệt danh mục có sẵn hoặc mô tả nhu cầu nguồn hàng riêng.",
  },
  {
    title: "Kiểm tra nguồn hàng & MOQ",
    description: "ATTD rà soát khả năng cung ứng, số lượng tối thiểu và thời gian phù hợp.",
  },
  {
    title: "Tư vấn phương án hoàn thiện",
    description: "Đề xuất logo, in/thêu, nhãn, đóng gói hoặc phát triển OEM khi cần.",
  },
  {
    title: "Chốt báo giá",
    description: "Báo giá theo số lượng, cấu hình sản phẩm và yêu cầu hoàn thiện.",
  },
  {
    title: "Triển khai & giao hàng",
    description: "Thực hiện sản xuất, kiểm tra và giao hàng theo tiến độ đã thống nhất.",
  },
];

export default function HomeSourcingProcessSection() {
  return (
    <section className="mp-section mp-section--alt mp-section--tight home-sourcing-flow">
      <div className="container">
        <MarketplaceSectionHeader
          title="Quy trình lấy nguồn hàng"
          description="Luồng làm việc rõ ràng: yêu cầu → kiểm tra nguồn/MOQ → phương án hoàn thiện → báo giá → triển khai/giao hàng."
        />
        <ol className="home-sourcing-flow__list">
          {SOURCING_STEPS.map((step, index) => (
            <li key={step.title} className="home-sourcing-flow__item">
              <span className="home-sourcing-flow__num">{String(index + 1).padStart(2, "0")}</span>
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

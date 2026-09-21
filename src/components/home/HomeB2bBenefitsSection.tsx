import Link from "next/link";
import {
  BarChart3,
  Database,
  Handshake,
  Layers3,
  PenTool,
  Truck,
  type LucideIcon,
} from "lucide-react";

const WHY_ATTD: Array<{
  title: string;
  description: string;
  Icon: LucideIcon;
}> = [
  {
    title: "Danh mục sản phẩm đầy đủ",
    description: "Hàng may mặc trơn, đồng phục, quà tặng và nhóm OEM cho nhiều kịch bản B2B.",
    Icon: Layers3,
  },
  {
    title: "Số lượng tối thiểu rõ ràng",
    description: "Tư vấn MOQ theo sản phẩm, tồn kho và nhu cầu triển khai thực tế.",
    Icon: BarChart3,
  },
  {
    title: "Hỗ trợ in/thêu/OEM",
    description: "Đi cùng đại lý, agency và doanh nghiệp từ lựa chọn mẫu đến hoàn thiện thương hiệu.",
    Icon: PenTool,
  },
  {
    title: "Hỗ trợ đại lý & agency",
    description: "Nguồn hàng, dữ liệu sản phẩm và tư vấn báo giá cho đội bán hàng chuyên nghiệp.",
    Icon: Handshake,
  },
  {
    title: "Giao hàng toàn quốc",
    description: "Phù hợp đơn hàng sự kiện, đồng phục nhân sự và chương trình quà tặng nhiều điểm giao.",
    Icon: Truck,
  },
  {
    title: "Dữ liệu sản phẩm đầy đủ",
    description: "Thông tin sản phẩm, hình ảnh, chất liệu và tùy chọn được trình bày rõ để dễ lấy nguồn.",
    Icon: Database,
  },
];

export default function HomeB2bBenefitsSection() {
  return (
    <section className="mp-section mp-section--tight home-b2b-benefits">
      <div className="container">
        <div className="home-b2b-benefits__layout">
          <div className="home-b2b-benefits__intro">
            <p className="home-b2b-benefits__eyebrow">Nền tảng nguồn hàng B2B</p>
            <h2 className="home-b2b-benefits__title">Vì sao chọn nguồn hàng B2B từ ATTD?</h2>
            <p className="home-b2b-benefits__description">
              ATTD giúp đại lý, agency, xưởng in và doanh nghiệp lấy nguồn hàng đồng phục, hàng may
              mặc trơn và quà tặng theo cách rõ ràng, có thể mở rộng.
            </p>
            <Link href="/lien-he" className="btn-primary home-b2b-benefits__cta">
              Tư vấn nguồn hàng
            </Link>
          </div>

          <div className="home-b2b-benefits__cards">
            {WHY_ATTD.map(({ title, description, Icon }) => (
              <article key={title} className="home-b2b-benefits__card">
                <span className="home-b2b-benefits__icon" aria-hidden>
                  <Icon size={18} />
                </span>
                <h3 className="home-b2b-benefits__card-title">{title}</h3>
                <p className="home-b2b-benefits__card-desc">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

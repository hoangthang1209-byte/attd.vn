import Link from "next/link";
import { BarChart3, Layers3, PackageCheck, PenTool, type LucideIcon } from "lucide-react";

const OPERATIONAL_PROOF: Array<{
  title: string;
  description: string;
  Icon: LucideIcon;
}> = [
  {
    title: "Nguồn hàng đa danh mục",
    description:
      "Đồng phục, hàng may mặc trơn, quà tặng và OEM — một đối tác cho nhiều hạng mục triển khai.",
    Icon: Layers3,
  },
  {
    title: "Tồn kho, in/thêu & OEM",
    description:
      "Đi từ sản phẩm có sẵn đến hoàn thiện logo, nhãn và phát triển riêng theo thương hiệu.",
    Icon: PenTool,
  },
  {
    title: "MOQ & lead time rõ ràng",
    description:
      "Tư vấn số lượng tối thiểu và thời gian triển khai theo từng nhóm sản phẩm và cấu hình.",
    Icon: BarChart3,
  },
  {
    title: "Kiểm tra & giao hàng toàn quốc",
    description:
      "Quy trình kiểm tra, đóng gói và phối hợp giao hàng cho đơn hàng sự kiện và dự án đa điểm.",
    Icon: PackageCheck,
  },
];

export default function HomeOperationalProofSection() {
  return (
    <section className="mp-section mp-section--tight home-operational-proof" aria-labelledby="home-operational-proof-title">
      <div className="container">
        <div className="home-operational-proof__header">
          <p className="home-operational-proof__eyebrow">Năng lực vận hành</p>
          <h2 id="home-operational-proof-title" className="home-operational-proof__title">
            ATTD hỗ trợ doanh nghiệp lấy nguồn hàng theo cách rõ ràng
          </h2>
          <p className="home-operational-proof__description">
            Tập trung vào nhu cầu thực tế của đội mua hàng, đại lý và agency — không phải các
            cam kết chung chung.
          </p>
        </div>

        <ul className="home-operational-proof__grid">
          {OPERATIONAL_PROOF.map(({ title, description, Icon }) => (
            <li key={title}>
              <article className="home-operational-proof__card">
                <span className="home-operational-proof__icon" aria-hidden>
                  <Icon size={18} />
                </span>
                <h3 className="home-operational-proof__card-title">{title}</h3>
                <p className="home-operational-proof__card-desc">{description}</p>
              </article>
            </li>
          ))}
        </ul>

        <div className="home-operational-proof__cta-wrap">
          <Link href="/lien-he" className="btn-secondary home-operational-proof__cta">
            Tư vấn nguồn hàng
          </Link>
        </div>
      </div>
    </section>
  );
}

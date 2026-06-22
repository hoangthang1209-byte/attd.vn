import Link from "next/link";
import { ArrowRight, Boxes, Handshake, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type PathwayCard = {
  key: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  Icon: LucideIcon;
};

const PATHWAYS: PathwayCard[] = [
  {
    key: "stock",
    title: "Hàng sẵn kho",
    description:
      "Khám phá các nhóm sản phẩm có sẵn để triển khai đơn hàng nhanh và chủ động hơn.",
    cta: "Xem nguồn hàng",
    href: "/san-pham",
    Icon: Boxes,
  },
  {
    key: "oem",
    title: "Đặt hàng OEM",
    description:
      "Phát triển sản phẩm theo chất liệu, màu sắc, nhận diện và yêu cầu riêng của thương hiệu.",
    cta: "Tìm hiểu OEM",
    href: "/oem",
    Icon: Layers,
  },
  {
    key: "dealer",
    title: "Nguồn hàng cho đại lý",
    description:
      "Tiếp cận danh mục và chính sách phù hợp cho đơn vị kinh doanh, agency và đối tác phân phối.",
    cta: "Dành cho đại lý",
    href: "/dai-ly",
    Icon: Handshake,
  },
];

export default function HomeSourcingPathwaysSection() {
  return (
    <section
      className="home-sourcing-pathways"
      aria-labelledby="home-sourcing-pathways-title"
    >
      <div className="container">
        <header className="home-sourcing-pathways__header">
          <p className="home-sourcing-pathways__eyebrow">Theo nhu cầu triển khai</p>
          <h2 id="home-sourcing-pathways-title" className="home-sourcing-pathways__title">
            Chọn hướng nguồn hàng phù hợp
          </h2>
          <p className="home-sourcing-pathways__description">
            Từ sản phẩm sẵn kho đến phương án phát triển riêng, chọn hướng phù hợp với cách bạn
            triển khai đơn hàng.
          </p>
        </header>

        <ul className="home-sourcing-pathways__grid">
          {PATHWAYS.map(({ key, title, description, cta, href, Icon }) => (
            <li key={key}>
              <Link href={href} className="home-sourcing-pathways__card">
                <span className="home-sourcing-pathways__icon-wrap" aria-hidden>
                  <Icon size={22} className="home-sourcing-pathways__icon" />
                </span>
                <h3 className="home-sourcing-pathways__card-title">{title}</h3>
                <p className="home-sourcing-pathways__card-desc">{description}</p>
                <span className="home-sourcing-pathways__cta">
                  {cta}
                  <ArrowRight size={16} className="home-sourcing-pathways__cta-icon" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

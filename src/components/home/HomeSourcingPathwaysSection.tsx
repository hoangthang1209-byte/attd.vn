import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Handshake,
  Layers,
  Palette,
  Tag,
  UsersRound,
  Warehouse,
} from "lucide-react";

type PathwayCard = {
  key: "stock" | "oem" | "dealer";
  title: string;
  description: string;
  cta: string;
  href: string;
};

const PATHWAYS: PathwayCard[] = [
  {
    key: "stock",
    title: "Hàng sẵn kho",
    description:
      "Khám phá các nhóm sản phẩm có sẵn để triển khai đơn hàng nhanh và chủ động hơn.",
    cta: "Xem nguồn hàng",
    href: "/san-pham",
  },
  {
    key: "oem",
    title: "Đặt hàng OEM",
    description:
      "Phát triển sản phẩm theo chất liệu, màu sắc, nhận diện và yêu cầu riêng của thương hiệu.",
    cta: "Tìm hiểu OEM",
    href: "/oem",
  },
  {
    key: "dealer",
    title: "Nguồn hàng cho đại lý",
    description:
      "Tiếp cận danh mục và chính sách phù hợp cho đơn vị kinh doanh, agency và đối tác phân phối.",
    cta: "Dành cho đại lý",
    href: "/dai-ly",
  },
];

function StockPathwayVisual() {
  return (
    <div className="home-sourcing-pathways__visual home-sourcing-pathways__visual--stock" aria-hidden>
      <span className="home-sourcing-pathways__visual-label">Sẵn sàng triển khai</span>
      <div className="home-sourcing-pathways__stock-scene">
        <div className="home-sourcing-pathways__stock-blocks">
          <span className="home-sourcing-pathways__stock-block home-sourcing-pathways__stock-block--1" />
          <span className="home-sourcing-pathways__stock-block home-sourcing-pathways__stock-block--2" />
          <span className="home-sourcing-pathways__stock-block home-sourcing-pathways__stock-block--3" />
        </div>
        <span className="home-sourcing-pathways__stock-badge">
          <Warehouse size={16} strokeWidth={1.75} />
        </span>
        <span className="home-sourcing-pathways__stock-status">
          <ClipboardCheck size={12} strokeWidth={2} />
          <span>Nguồn hàng có sẵn</span>
        </span>
      </div>
      <div className="home-sourcing-pathways__stock-line" />
    </div>
  );
}

function OemPathwayVisual() {
  const steps = [
    { label: "Chất liệu", Icon: Layers },
    { label: "Màu sắc", Icon: Palette },
    { label: "Nhãn hiệu", Icon: Tag },
  ] as const;

  return (
    <div className="home-sourcing-pathways__visual home-sourcing-pathways__visual--oem" aria-hidden>
      <span className="home-sourcing-pathways__visual-label">Phát triển theo yêu cầu</span>
      <ol className="home-sourcing-pathways__oem-flow">
        {steps.map(({ label, Icon }, index) => (
          <li key={label} className="home-sourcing-pathways__oem-step">
            <span
              className={`home-sourcing-pathways__oem-node${
                index === 1 ? " home-sourcing-pathways__oem-node--accent" : ""
              }`}
            >
              <Icon size={14} strokeWidth={1.75} />
            </span>
            <span className="home-sourcing-pathways__oem-step-label">{label}</span>
            {index < steps.length - 1 && (
              <span className="home-sourcing-pathways__oem-connector" />
            )}
          </li>
        ))}
      </ol>
      <span className="home-sourcing-pathways__oem-accent-dot" />
    </div>
  );
}

function DealerPathwayVisual() {
  const nodes = [
    { label: "ATTD", Icon: Building2 },
    { label: "Đại lý", Icon: Handshake },
    { label: "Khách hàng", Icon: UsersRound },
  ] as const;

  return (
    <div className="home-sourcing-pathways__visual home-sourcing-pathways__visual--dealer" aria-hidden>
      <span className="home-sourcing-pathways__visual-label">Kết nối nguồn hàng</span>
      <ol className="home-sourcing-pathways__dealer-network">
        {nodes.map(({ label, Icon }, index) => (
          <li key={label} className="home-sourcing-pathways__dealer-node-wrap">
            <span className="home-sourcing-pathways__dealer-node">
              <Icon size={14} strokeWidth={1.75} />
              <span>{label}</span>
            </span>
            {index < nodes.length - 1 && (
              <span className="home-sourcing-pathways__dealer-arrow">
                <ArrowRight size={12} strokeWidth={2} />
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

const VISUALS = {
  stock: StockPathwayVisual,
  oem: OemPathwayVisual,
  dealer: DealerPathwayVisual,
} as const;

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
          {PATHWAYS.map(({ key, title, description, cta, href }) => {
            const Visual = VISUALS[key];
            return (
              <li key={key} className="home-sourcing-pathways__grid-item">
                <Link href={href} className="home-sourcing-pathways__card">
                  <Visual />
                  <div className="home-sourcing-pathways__body">
                    <h3 className="home-sourcing-pathways__card-title">{title}</h3>
                    <p className="home-sourcing-pathways__card-desc">{description}</p>
                    <span className="home-sourcing-pathways__cta">
                      {cta}
                      <ArrowRight
                        size={16}
                        className="home-sourcing-pathways__cta-icon"
                        aria-hidden
                      />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

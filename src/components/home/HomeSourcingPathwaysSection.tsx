import Link from "next/link";
import Image from "next/image";
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
import type { HomepageSourcingPathwayConfig } from "@/features/home/homepage.types";

type Props = {
  pathways: HomepageSourcingPathwayConfig[];
};

function StockPathwayVisual({ microLabel }: { microLabel: string }) {
  return (
    <div className="home-sourcing-pathways__visual home-sourcing-pathways__visual--stock" aria-hidden>
      <span className="home-sourcing-pathways__visual-label">{microLabel}</span>
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

function OemPathwayVisual({ microLabel }: { microLabel: string }) {
  const steps = [
    { label: "Chất liệu", Icon: Layers },
    { label: "Màu sắc", Icon: Palette },
    { label: "Nhãn hiệu", Icon: Tag },
  ] as const;

  return (
    <div className="home-sourcing-pathways__visual home-sourcing-pathways__visual--oem" aria-hidden>
      <span className="home-sourcing-pathways__visual-label">{microLabel}</span>
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
            {index < steps.length - 1 && <span className="home-sourcing-pathways__oem-connector" />}
          </li>
        ))}
      </ol>
      <span className="home-sourcing-pathways__oem-accent-dot" />
    </div>
  );
}

function DealerPathwayVisual({ microLabel }: { microLabel: string }) {
  const nodes = [
    { label: "ATTD", Icon: Building2 },
    { label: "Đại lý", Icon: Handshake },
    { label: "Khách hàng", Icon: UsersRound },
  ] as const;

  return (
    <div className="home-sourcing-pathways__visual home-sourcing-pathways__visual--dealer" aria-hidden>
      <span className="home-sourcing-pathways__visual-label">{microLabel}</span>
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

const FALLBACK_VISUALS = {
  stock: StockPathwayVisual,
  oem: OemPathwayVisual,
  dealer: DealerPathwayVisual,
} as const;

function PathwayVisualPanel({ pathway }: { pathway: HomepageSourcingPathwayConfig }) {
  if (pathway.imageUrl) {
    return (
      <div className="home-sourcing-pathways__visual home-sourcing-pathways__visual--image">
        <span className="home-sourcing-pathways__visual-label home-sourcing-pathways__visual-label--overlay">
          {pathway.microLabel}
        </span>
        <div className="home-sourcing-pathways__visual-image-wrap">
          <Image
            src={pathway.imageUrl}
            alt={pathway.imageAlt ?? pathway.title}
            fill
            className="home-sourcing-pathways__visual-image"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      </div>
    );
  }

  const Visual = FALLBACK_VISUALS[pathway.visualFallbackKey];
  return <Visual microLabel={pathway.microLabel} />;
}

export default function HomeSourcingPathwaysSection({ pathways }: Props) {
  const visible = pathways.filter((p) => p.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  if (visible.length === 0) return null;

  return (
    <section className="home-sourcing-pathways" aria-labelledby="home-sourcing-pathways-title">
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
          {visible.map((pathway) => (
            <li key={pathway.slot} className="home-sourcing-pathways__grid-item">
              <Link href={pathway.ctaUrl} className="home-sourcing-pathways__card">
                <PathwayVisualPanel pathway={pathway} />
                <div className="home-sourcing-pathways__body">
                  <h3 className="home-sourcing-pathways__card-title">{pathway.title}</h3>
                  <p className="home-sourcing-pathways__card-desc">{pathway.description}</p>
                  <span className="home-sourcing-pathways__cta">
                    {pathway.ctaLabel}
                    <ArrowRight size={16} className="home-sourcing-pathways__cta-icon" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

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
    <section className="home-sourcing-pathways home-sourcing-pathways--v4" aria-labelledby="home-sourcing-pathways-title">
      <div className="container">
        <header className="home-sourcing-pathways-v4__header">
          <div>
            <p className="home-sourcing-pathways__eyebrow">Chọn theo nhu cầu</p>
            <h2 id="home-sourcing-pathways-title" className="home-sourcing-pathways-v4__title">
              Ba cách làm việc với ATTD
            </h2>
          </div>
          <p className="home-sourcing-pathways-v4__description">
            Không bắt khách đi qua cùng một funnel. Chọn đúng mô hình — hàng sẵn, OEM hoặc đại lý — rồi đi thẳng vào dữ liệu và báo giá phù hợp.
          </p>
        </header>

        <ol className="home-sourcing-pathways-v4__list">
          {visible.map((pathway, index) => (
            <li key={pathway.slot} className="home-sourcing-pathways-v4__item">
              <Link href={pathway.ctaUrl} className="home-sourcing-pathways-v4__row">
                <div className="home-sourcing-pathways-v4__index">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="home-sourcing-pathways-v4__visual">
                  <PathwayVisualPanel pathway={pathway} />
                </div>
                <div className="home-sourcing-pathways-v4__content">
                  <span className="home-sourcing-pathways-v4__micro">{pathway.microLabel}</span>
                  <h3>{pathway.title}</h3>
                  <p>{pathway.description}</p>
                  <span className="home-sourcing-pathways-v4__cta">
                    {pathway.ctaLabel}
                    <ArrowRight size={16} aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

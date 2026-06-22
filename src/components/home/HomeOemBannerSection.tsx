import Link from "next/link";
import { ArrowRight, ArrowRightLeft, Layers, Package, Rocket } from "lucide-react";

const OEM_FLOW_STEPS = [
  { key: "product", label: "Sản phẩm", Icon: Package },
  { key: "custom", label: "Tùy chỉnh", Icon: Layers },
  { key: "brand", label: "Thương hiệu", Icon: ArrowRightLeft },
  { key: "deploy", label: "Triển khai", Icon: Rocket },
] as const;

export default function HomeOemBannerSection() {
  return (
    <section className="home-oem-banner" aria-labelledby="home-oem-banner-title">
      <div className="container">
        <div className="home-oem-banner__inner">
          <div className="home-oem-banner__content">
            <p className="home-oem-banner__eyebrow">OEM &amp; Private Label</p>
            <h2 id="home-oem-banner-title" className="home-oem-banner__title">
              Phát triển nguồn hàng theo thương hiệu của bạn
            </h2>
            <p className="home-oem-banner__description">
              Từ sản phẩm sẵn có đến phương án phát triển riêng, ATTD hỗ trợ bạn xác định hướng
              nguồn hàng phù hợp với nhu cầu triển khai.
            </p>
            <Link href="/oem" className="home-oem-banner__cta btn-primary">
              Tìm hiểu dịch vụ OEM
              <ArrowRight size={18} className="home-oem-banner__cta-icon" aria-hidden />
            </Link>
          </div>

          <div className="home-oem-banner__visual" aria-hidden>
            <ol className="home-oem-banner__flow">
              {OEM_FLOW_STEPS.map(({ key, label, Icon }, index) => (
                <li key={key} className="home-oem-banner__flow-step">
                  <span className="home-oem-banner__flow-node">
                    <Icon size={18} className="home-oem-banner__flow-icon" />
                  </span>
                  <span className="home-oem-banner__flow-label">{label}</span>
                  {index < OEM_FLOW_STEPS.length - 1 && (
                    <span className="home-oem-banner__flow-connector" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

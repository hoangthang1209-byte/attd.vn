import Link from "next/link";
import TrackedLink from "@/components/analytics/TrackedLink";
import { CTA } from "@/lib/ctaConfig";

type CTASectionProps = {
  title?: string;
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  trackSource?: string;
  showSecondary?: boolean;
};

export default function CTASection({
  title = "Trở thành đại lý ATTD",
  description = "Đăng ký tài khoản đại lý để nhận chính sách giá tốt hơn và cập nhật nguồn hàng mới nhất.",
  primaryLabel = CTA.primary.label,
  primaryHref = CTA.primary.href,
  trackSource = "HOMEPAGE",
  showSecondary = true,
}: CTASectionProps) {
  return (
    <section className="section-compact">
      <div className="container">
        <div className="cta-section-card">
          <h2 className="cta-section-title">{title}</h2>
          <p className="cta-section-desc">{description}</p>
          <div className="cta-section-actions">
            <TrackedLink
              href={primaryHref}
              trackEvent={CTA.primary.event}
              trackSource={trackSource}
              className="btn-primary"
            >
              {primaryLabel}
            </TrackedLink>
            {showSecondary && (
              <TrackedLink
                href={CTA.secondary.href}
                trackEvent={CTA.secondary.event}
                trackSource={trackSource}
                className="btn-secondary cta-section-btn-secondary"
              >
                {CTA.secondary.label}
              </TrackedLink>
            )}
            <Link href={CTA.tertiary.href} className="btn-tertiary cta-section-btn-tertiary">
              {CTA.tertiary.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

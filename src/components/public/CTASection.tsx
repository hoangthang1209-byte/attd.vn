import TrackedLink from "@/components/analytics/TrackedLink";

type CTASectionProps = {
  title?: string;
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  trackSource?: string;
};

export default function CTASection({
  title = "Trở thành đại lý ATTD",
  description = "Đăng ký tài khoản đại lý để nhận chính sách giá tốt hơn và cập nhật nguồn hàng mới nhất.",
  primaryLabel = "Đăng ký đại lý",
  primaryHref = "/dai-ly",
  trackSource = "HOMEPAGE",
}: CTASectionProps) {
  return (
    <section className="section-compact">
      <div className="container">
        <div
          className="premium-card-static"
          style={{
            padding: "48px 40px",
            textAlign: "center",
            background: "#111827",
            border: "none",
            color: "#ffffff",
          }}
        >
          <h2
            style={{
              margin: "0 0 16px",
              fontSize: "clamp(24px, 3vw, 32px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h2>
          <p
            style={{
              margin: "0 auto 32px",
              maxWidth: 520,
              fontSize: "16px",
              lineHeight: 1.7,
              color: "#9ca3af",
            }}
          >
            {description}
          </p>
          <TrackedLink
            href={primaryHref}
            trackEvent="dealer_registration_click"
            trackSource={trackSource}
            className="btn-primary"
            style={{ background: "#dc2626" }}
          >
            {primaryLabel}
          </TrackedLink>
        </div>
      </div>
    </section>
  );
}

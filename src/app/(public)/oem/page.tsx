import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl, buildOgImages } from "@/lib/seo";
import { CTA } from "@/lib/ctaConfig";
import DealerLeadForm from "@/components/forms/DealerLeadForm";
import TrackedLink from "@/components/analytics/TrackedLink";
import FaqSchema from "@/components/seo/FaqSchema";
import LandingHeroVisual from "@/components/public/LandingHeroVisual";
import { getZaloUrl } from "@/lib/companyInfo";
import { resolveBespokeLanding } from "@/features/landing-pages/resolve-bespoke-landing";
import { getLandingDemoImage } from "@/features/demo/demo-image-map";

export async function generateMetadata(): Promise<Metadata> {
  const landing = await resolveBespokeLanding("oem");
  return {
    title: landing.metaTitle,
    description: landing.metaDescription,
    alternates: { canonical: canonicalUrl("/oem") },
    openGraph: {
      title: landing.metaTitle,
      description: landing.metaDescription,
      images: buildOgImages(),
    },
  };
}

const steps = [
  { n: "01", title: "Liên hệ tư vấn", body: "Gửi yêu cầu qua form hoặc Zalo. Đội ngũ ATTD phản hồi trong vòng 24 giờ." },
  { n: "02", title: "Chọn sản phẩm & số lượng", body: "Chọn dòng sản phẩm, màu sắc, size theo bảng màu và catalog ATTD." },
  { n: "03", title: "Xác nhận đơn hàng", body: "Ký xác nhận đơn hàng, thanh toán cọc theo chính sách." },
  { n: "04", title: "Nhận hàng & kiểm tra", body: "Hàng được đóng gói theo yêu cầu, giao toàn quốc qua đơn vị vận chuyển uy tín." },
];

const capabilities = [
  { title: "Hàng trơn sẵn kho", body: "Áo thun, polo, tote bag, nón — nhiều màu, nhiều size, giao ngay." },
  { title: "Nhãn & tag theo yêu cầu", body: "Hỗ trợ gắn nhãn thương hiệu, woven label, giấy tag theo đơn hàng." },
  { title: "Đóng gói riêng", body: "Đóng gói poly bag, hộp carton hoặc theo yêu cầu thương hiệu." },
  { title: "Tư vấn chọn chất liệu", body: "Cotton 100%, Cotton/Poly blend, Polyester — theo mục đích sử dụng." },
];

export default async function OemPage() {
  const landing = await resolveBespokeLanding("oem");
  const faqItems = landing.faq.map((item) => ({ q: item.question, a: item.answer }));

  return (
    <main>
      {faqItems.length > 0 && <FaqSchema items={landing.faq} />}
      <LandingHeroVisual
        eyebrow="OEM / Private Label"
        title={landing.heroTitle}
        description={landing.heroDescription}
        imageUrl={getLandingDemoImage("oem")}
        primaryCta={{ href: landing.primaryCtaHref, label: landing.primaryCtaLabel }}
        secondaryCta={{ href: getZaloUrl(), label: "Chat Zalo" }}
      />

      {/* OEM Capabilities */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">ATTD OEM hỗ trợ gì?</h2>
          <p className="section-description">
            Nguồn hàng blank apparel phù hợp cho thương hiệu cần sản phẩm gắn nhãn riêng.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "20px",
              marginTop: "32px",
            }}
          >
            {capabilities.map((c) => (
              <div key={c.title} className="card">
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    marginBottom: "8px",
                    color: "#111827",
                  }}
                >
                  {c.title}
                </h3>
                <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.6, margin: 0 }}>
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MOQ */}
      <section
        className="section"
        style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}
      >
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 className="section-title">Chính sách MOQ</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "16px",
              marginTop: "28px",
            }}
          >
            {[
              { label: "Áo thun trơn", moq: "Liên hệ" },
              { label: "Polo trơn", moq: "Liên hệ" },
              { label: "Tote bag", moq: "Liên hệ" },
              { label: "Nón", moq: "Liên hệ" },
            ].map((item) => (
              <div
                key={item.label}
                className="card"
                style={{ textAlign: "center" }}
              >
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#111827",
                    marginBottom: "4px",
                  }}
                >
                  {item.moq}
                </div>
                <div style={{ fontSize: "13px", color: "#6b7280" }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          <p
            style={{
              marginTop: "20px",
              fontSize: "14px",
              color: "#9ca3af",
              textAlign: "center",
            }}
          >
            MOQ cụ thể phụ thuộc dòng sản phẩm.{" "}
            <Link href="/lien-he" style={{ color: "#374151" }}>
              Liên hệ để được tư vấn.
            </Link>
          </p>
        </div>
      </section>

      {/* Process */}
      <section className="section">
        <div className="container" style={{ maxWidth: "760px" }}>
          <h2 className="section-title">Quy trình đặt hàng OEM</h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0",
              marginTop: "32px",
            }}
          >
            {steps.map((s, i) => (
              <div
                key={s.n}
                style={{
                  display: "flex",
                  gap: "24px",
                  alignItems: "flex-start",
                  paddingBottom: i < steps.length - 1 ? "32px" : 0,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "#111827",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {s.n}
                </div>

                <div style={{ paddingTop: "10px" }}>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      marginBottom: "6px",
                      color: "#111827",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#6b7280",
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        className="section"
        style={{ borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}
      >
        <div className="container" style={{ maxWidth: "720px" }}>
          <h2 className="section-title">Câu hỏi thường gặp</h2>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "28px" }}
          >
            {faqItems.map(({ q, a }) => (
              <details
                key={q}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  background: "#fff",
                  overflow: "hidden",
                }}
              >
                <summary
                  style={{
                    padding: "16px 20px",
                    fontWeight: 600,
                    fontSize: "15px",
                    color: "#111827",
                    cursor: "pointer",
                    listStyle: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    userSelect: "none",
                  }}
                >
                  {q}
                  <span aria-hidden style={{ color: "#9ca3af", flexShrink: 0 }}>+</span>
                </summary>
                <div
                  style={{
                    padding: "0 20px 16px",
                    borderTop: "1px solid #f3f4f6",
                  }}
                >
                  <p
                    style={{
                      margin: "12px 0 0",
                      fontSize: "15px",
                      lineHeight: 1.7,
                      color: "#4b5563",
                    }}
                  >
                    {a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {landing.seoContent && (
        <section className="section" style={{ borderTop: "1px solid #e5e7eb" }}>
          <div
            className="container"
            style={{ maxWidth: "860px" }}
            dangerouslySetInnerHTML={{ __html: landing.seoContent }}
          />
        </section>
      )}

      {/* CTA + Form */}
      <section className="section" style={{ borderTop: "1px solid #e5e7eb" }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "48px",
              alignItems: "start",
            }}
          >
            {/* Left: info */}
            <div>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: 800,
                  color: "#111827",
                  marginBottom: "16px",
                  lineHeight: 1.2,
                }}
              >
                Bắt đầu đặt hàng OEM
              </h2>
              <p
                style={{
                  fontSize: "16px",
                  color: "#6b7280",
                  lineHeight: 1.7,
                  marginBottom: "28px",
                }}
              >
                Điền form để nhận báo giá và tư vấn nguồn hàng phù hợp với thương hiệu của bạn. ATTD phản hồi trong 24 giờ làm việc.
              </p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <TrackedLink
                  href={getZaloUrl()}
                  trackEvent="contact_zalo"
                  trackSource="OEM_PAGE"
                  external
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  Chat Zalo ngay
                </TrackedLink>
                <Link href="/nguon-hang" style={{ fontSize: "14px", color: "#6b7280", alignSelf: "center", textDecoration: "underline" }}>
                  Xem nguồn hàng sỉ
                </Link>
              </div>
            </div>

            {/* Right: form */}
            <DealerLeadForm source="OEM_PAGE" title="Nhận báo giá OEM" />
          </div>
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl, buildOgImages } from "@/lib/seo";
import DealerLeadForm from "@/components/forms/DealerLeadForm";
import TrackedLink from "@/components/analytics/TrackedLink";
import FaqSchema from "@/components/seo/FaqSchema";
import LandingHeroVisual from "@/components/public/LandingHeroVisual";
import { getZaloUrl } from "@/lib/companyInfo";
import { resolveBespokeLanding } from "@/features/landing-pages/resolve-bespoke-landing";
import { getPublicSurfaceMedia } from "@/features/media/public-surface-media";

export const revalidate = 3600;

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
  { n: "01", title: "Gửi brief / mẫu tham khảo", body: "Gửi sản phẩm, số lượng, logo, chất liệu mong muốn hoặc mẫu thực tế. Brief chưa đầy đủ vẫn có thể bắt đầu." },
  { n: "02", title: "Chốt cấu hình & phương án sản xuất", body: "ATTD rà soát nguồn hàng, chất liệu, in/thêu, nhãn tag, đóng gói, MOQ và tiến độ phù hợp." },
  { n: "03", title: "Mẫu / xác nhận kỹ thuật", body: "Thống nhất thông số, màu sắc, kỹ thuật hoàn thiện và mẫu khi dự án cần duyệt trước bulk." },
  { n: "04", title: "Triển khai, QC & giao hàng", body: "ATTD điều phối các công đoạn sản xuất, kiểm hàng, hoàn thiện, đóng gói và bàn giao theo tiến độ đã thống nhất." },
];

const capabilities = [
  { title: "Nguồn hàng & phát triển sản phẩm", body: "Bắt đầu từ hàng trơn sẵn có hoặc phát triển cấu hình riêng theo yêu cầu dự án." },
  { title: "In / thêu / hoàn thiện thương hiệu", body: "Tư vấn kỹ thuật in, thêu, vị trí logo và phương án phù hợp chất liệu, số lượng." },
  { title: "Nhãn, tag & đóng gói riêng", body: "Woven label, nhãn cổ, hangtag, poly bag, hộp và các yêu cầu private label." },
  { title: "Điều phối sản xuất & QC", body: "ATTD quản lý đầu việc sản xuất, kiểm hàng và hoàn thiện thông qua năng lực nội bộ cùng mạng lưới đối tác." },
];

export default async function OemPage() {
  const [landing, heroMedia] = await Promise.all([
    resolveBespokeLanding("oem"),
    getPublicSurfaceMedia("oem"),
  ]);
  const faqItems = landing.faq.map((item) => {
    const answer = /không cung cấp dịch vụ in ấn/i.test(item.answer)
      ? "Có. ATTD tư vấn và điều phối các công đoạn in, thêu, nhãn tag, đóng gói và hoàn thiện thương hiệu theo yêu cầu từng dự án. Tùy cấu hình, một số công đoạn được thực hiện cùng mạng lưới đối tác sản xuất chuyên môn."
      : item.answer;
    return { q: item.question, a: answer };
  });

  return (
    <main>
      {faqItems.length > 0 && <FaqSchema items={faqItems.map(({ q, a }) => ({ question: q, answer: a }))} />}
      <LandingHeroVisual
        eyebrow="OEM / Private Label"
        title="OEM / Private Label cho đồng phục & merchandise doanh nghiệp"
        description="ATTD hỗ trợ từ chọn nguồn hàng, cấu hình sản phẩm, in/thêu, nhãn tag và đóng gói đến điều phối sản xuất, QC và giao hàng theo yêu cầu dự án."
        imageUrl={heroMedia?.url}
        primaryCta={{ href: landing.primaryCtaHref, label: landing.primaryCtaLabel }}
        secondaryCta={{ href: getZaloUrl(), label: "Chat Zalo" }}
      />

      {/* OEM Capabilities */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">ATTD OEM hỗ trợ gì?</h2>
          <p className="section-description">
            Từ hàng sẵn có đến sản phẩm phát triển riêng — một đầu mối để kiểm soát cấu hình, hoàn thiện thương hiệu, tiến độ và QC.
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

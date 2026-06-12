import Link from "next/link";
import type { FaqItem } from "@/components/seo/FaqSchema";

export interface ContentBenefit {
  title: string;
  description: string;
}

export interface CollectionSEOContentProps {
  title: string;
  intro: string;
  benefits: ContentBenefit[];
  applications: ContentBenefit[];
  faq: FaqItem[];
  ctaTitle: string;
  ctaDescription: string;
}

const sectionStyle: React.CSSProperties = {
  padding: "56px 0",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "860px",
  margin: "0 auto",
  padding: "0 24px",
};

const h2Style: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#111827",
  marginBottom: "24px",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "20px",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "20px 22px",
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#111827",
  marginBottom: "8px",
};

const cardDescStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.7",
  color: "#4b5563",
  margin: 0,
};

export default function CollectionSEOContent({
  title,
  intro,
  benefits,
  applications,
  faq,
  ctaTitle,
  ctaDescription,
}: CollectionSEOContentProps) {
  return (
    <>
      {/* ── Introduction ─────────────────────────────────────────────────────── */}
      <section
        style={{ ...sectionStyle, background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}
      >
        <div style={containerStyle}>
          <h2 style={h2Style}>Về {title}</h2>
          <div
            style={{
              fontSize: "15px",
              lineHeight: "1.8",
              color: "#374151",
            }}
            dangerouslySetInnerHTML={{ __html: intro }}
          />
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────────────── */}
      {benefits.length > 0 && (
        <section style={sectionStyle}>
          <div style={containerStyle}>
            <h2 style={h2Style}>Tại sao chọn nguồn hàng từ ATTD?</h2>
            <div style={gridStyle}>
              {benefits.map((b, i) => (
                <article key={i} style={cardStyle}>
                  <h3 style={cardTitleStyle}>{b.title}</h3>
                  <p style={cardDescStyle}>{b.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Applications ─────────────────────────────────────────────────────── */}
      {applications.length > 0 && (
        <section style={{ ...sectionStyle, background: "#f9fafb" }}>
          <div style={containerStyle}>
            <h2 style={h2Style}>Ứng dụng phổ biến</h2>
            <div style={gridStyle}>
              {applications.map((a, i) => (
                <article key={i} style={cardStyle}>
                  <h3 style={cardTitleStyle}>{a.title}</h3>
                  <p style={cardDescStyle}>{a.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      {faq.length > 0 && (
        <section style={sectionStyle}>
          <div style={containerStyle}>
            <h2 style={h2Style}>Câu hỏi thường gặp</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {faq.map((item, i) => (
                <details
                  key={i}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    overflow: "hidden",
                  }}
                >
                  <summary
                    style={{
                      padding: "16px 20px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "15px",
                      color: "#111827",
                      background: "#fff",
                      listStyle: "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {item.question}
                    <span
                      aria-hidden="true"
                      style={{ color: "#9ca3af", fontSize: "18px", flexShrink: 0 }}
                    >
                      +
                    </span>
                  </summary>
                  <div
                    style={{
                      padding: "0 20px 16px",
                      fontSize: "14px",
                      lineHeight: "1.75",
                      color: "#4b5563",
                      background: "#f9fafb",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <p style={{ margin: "16px 0 0" }}>{item.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section
        style={{
          ...sectionStyle,
          background: "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)",
          color: "#fff",
        }}
      >
        <div
          style={{
            ...containerStyle,
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#fff",
              marginBottom: "12px",
            }}
          >
            {ctaTitle}
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "rgba(255,255,255,0.85)",
              marginBottom: "32px",
              maxWidth: "600px",
              margin: "0 auto 32px",
              lineHeight: "1.7",
            }}
          >
            {ctaDescription}
          </p>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/dai-ly"
              style={{
                display: "inline-block",
                padding: "13px 28px",
                background: "#fff",
                color: "#1d4ed8",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "15px",
                textDecoration: "none",
              }}
            >
              Đăng ký đại lý
            </Link>
            <Link
              href="/lien-he"
              style={{
                display: "inline-block",
                padding: "13px 28px",
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "15px",
                textDecoration: "none",
              }}
            >
              Liên hệ tư vấn
            </Link>
          </div>

          {/* Internal links */}
          <p
            style={{
              marginTop: "24px",
              fontSize: "13px",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Tìm hiểu thêm:{" "}
            <Link
              href="/oem"
              style={{ color: "rgba(255,255,255,0.8)", textDecoration: "underline" }}
            >
              OEM &amp; Private Label
            </Link>
            {" · "}
            <Link
              href="/chinh-sach-dai-ly"
              style={{ color: "rgba(255,255,255,0.8)", textDecoration: "underline" }}
            >
              Chính sách đại lý
            </Link>
            {" · "}
            <Link
              href="/nguon-hang"
              style={{ color: "rgba(255,255,255,0.8)", textDecoration: "underline" }}
            >
              Nguồn hàng sỉ
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

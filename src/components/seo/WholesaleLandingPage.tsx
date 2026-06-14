/**
 * Shared layout component for wholesale blank apparel SEO cluster pages.
 *
 * Reuses CollectionSchema, FaqSchema, Breadcrumb.
 * Renders 8 sections: Hero → Suitable customers → Why ATTD →
 * Product categories → Cooperation process → FAQ → CTA.
 */

import Link from "next/link";
import Breadcrumb from "@/components/seo/Breadcrumb";
import CollectionSchema from "@/components/seo/CollectionSchema";
import FaqSchema from "@/components/seo/FaqSchema";
import type { WholesaleContent } from "@/lib/wholesaleContent";

// All 5 product category links — same across every wholesale page
const PRODUCT_CATEGORIES = [
  {
    name: "Áo Thun Trơn",
    href: "/ao-thun-tron",
    desc: "Cotton cao cấp, đa màu sắc, đủ size S-4XL — nền tảng cho xưởng in và đồng phục.",
  },
  {
    name: "Áo Polo Trơn",
    href: "/ao-polo-tron",
    desc: "Pique cotton lịch sự, phù hợp in thêu đồng phục doanh nghiệp.",
  },
  {
    name: "Nón Trơn",
    href: "/non",
    desc: "Nón lưỡi trai, bucket, snapback — đa kiểu dáng cho đồng phục và sự kiện.",
  },
  {
    name: "Túi Tote Canvas",
    href: "/tote",
    desc: "Canvas bền đẹp, phù hợp in logo và quà tặng doanh nghiệp.",
  },
  {
    name: "Bình Giữ Nhiệt",
    href: "/binh-giu-nhiet",
    desc: "Inox 304 an toàn thực phẩm — quà tặng doanh nghiệp phổ biến nhất.",
  },
] as const;

interface WholesaleLandingPageProps {
  slug: string;
  content: WholesaleContent;
  canonicalUrl: string;
}

// ── Shared inline styles ───────────────────────────────────────────────────

const sec: React.CSSProperties = { padding: "56px 0" };
const secAlt: React.CSSProperties = {
  padding: "56px 0",
  background: "#f9fafb",
  borderTop: "1px solid #e5e7eb",
};
const ctr: React.CSSProperties = {
  maxWidth: "860px",
  margin: "0 auto",
  padding: "0 24px",
};
const h2: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#111827",
  marginBottom: "24px",
};
const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "20px",
};
const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "20px 22px",
};
const cardTitle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#111827",
  marginBottom: "8px",
};
const cardDesc: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.7",
  color: "#4b5563",
  margin: 0,
};

export default function WholesaleLandingPage({
  slug,
  content,
  canonicalUrl,
}: WholesaleLandingPageProps) {
  return (
    <main>
      {/* ── Structured Data ──────────────────────────────────────────────────── */}
      <CollectionSchema
        title={content.seoTitle}
        description={content.metaDescription}
        url={canonicalUrl}
      />
      <FaqSchema items={content.faq} />

      {/* ── Breadcrumb ───────────────────────────────────────────────────────── */}
      <Breadcrumb items={[{ name: content.h1, href: `/${slug}` }]} />

      {/* ── SECTION 1: Hero ──────────────────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(135deg, #0f2942 0%, #1d4ed8 100%)",
          padding: "64px 0 56px",
          color: "#fff",
        }}
      >
        <div style={{ ...ctr, maxWidth: "780px", textAlign: "center" }}>
          <h1
            style={{
              fontSize: "clamp(24px, 4vw, 36px)",
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.25,
              marginBottom: "20px",
            }}
          >
            {content.h1}
          </h1>
          <p
            style={{
              fontSize: "17px",
              lineHeight: "1.75",
              color: "rgba(255,255,255,0.88)",
              maxWidth: "640px",
              margin: "0 auto 36px",
            }}
          >
            {content.heroIntro}
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
              Liên hệ báo giá
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: Introduction ──────────────────────────────────────────── */}
      <section style={secAlt}>
        <div style={ctr}>
          <h2 style={h2}>Về {content.h1}</h2>
          <div
            style={{ fontSize: "15px", lineHeight: "1.8", color: "#374151" }}
            dangerouslySetInnerHTML={{ __html: content.intro }}
          />
        </div>
      </section>

      {/* ── SECTION 3: Suitable Customers ────────────────────────────────────── */}
      {content.suitableCustomers.length > 0 && (
        <section style={sec}>
          <div style={ctr}>
            <h2 style={h2}>Phù hợp với đối tượng nào?</h2>
            <div style={grid2}>
              {content.suitableCustomers.map((c, i) => (
                <article key={i} style={card}>
                  <h3 style={cardTitle}>{c.title}</h3>
                  <p style={cardDesc}>{c.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 4: Why ATTD ──────────────────────────────────────────────── */}
      {content.whyAttd.length > 0 && (
        <section style={secAlt}>
          <div style={ctr}>
            <h2 style={h2}>Tại sao chọn nguồn hàng ATTD?</h2>
            <div style={grid2}>
              {content.whyAttd.map((w, i) => (
                <article key={i} style={card}>
                  <h3 style={cardTitle}>{w.title}</h3>
                  <p style={cardDesc}>{w.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 5: Product Categories ────────────────────────────────────── */}
      <section style={sec}>
        <div style={ctr}>
          <h2 style={h2}>Danh mục sản phẩm trơn</h2>
          <p
            style={{
              fontSize: "15px",
              color: "#4b5563",
              marginBottom: "24px",
              lineHeight: "1.7",
            }}
          >
            ATTD cung cấp đầy đủ các mặt hàng trơn blank phổ biến nhất cho
            xưởng in, đại lý và doanh nghiệp:
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            {PRODUCT_CATEGORIES.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                style={{
                  display: "block",
                  ...card,
                  textDecoration: "none",
                }}
              >
                <h3
                  style={{
                    ...cardTitle,
                    color: "#1d4ed8",
                  }}
                >
                  {cat.name} →
                </h3>
                <p style={cardDesc}>{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: Cooperation Process ───────────────────────────────────── */}
      {content.process.length > 0 && (
        <section style={secAlt}>
          <div style={ctr}>
            <h2 style={h2}>Quy trình hợp tác</h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {content.process.map((step) => (
                <div
                  key={step.step}
                  style={{
                    display: "flex",
                    gap: "16px",
                    alignItems: "flex-start",
                    ...card,
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "#1d4ed8",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "14px",
                    }}
                    aria-hidden="true"
                  >
                    {step.step}
                  </div>
                  <div>
                    <h3 style={{ ...cardTitle, marginBottom: "6px" }}>
                      {step.title}
                    </h3>
                    <p style={cardDesc}>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 7: FAQ ───────────────────────────────────────────────────── */}
      {content.faq.length > 0 && (
        <section style={sec}>
          <div style={ctr}>
            <h2 style={h2}>Câu hỏi thường gặp</h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {content.faq.map((item, i) => (
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
                      style={{
                        color: "#9ca3af",
                        fontSize: "18px",
                        flexShrink: 0,
                      }}
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

      {/* ── SECTION 8: CTA ───────────────────────────────────────────────────── */}
      <section
        style={{
          ...sec,
          background: "linear-gradient(135deg, #0f2942 0%, #1d4ed8 100%)",
          color: "#fff",
        }}
      >
        <div style={{ ...ctr, textAlign: "center" }}>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#fff",
              marginBottom: "12px",
            }}
          >
            {content.ctaTitle}
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "rgba(255,255,255,0.85)",
              maxWidth: "600px",
              margin: "0 auto 32px",
              lineHeight: "1.7",
            }}
          >
            {content.ctaDescription}
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
              href={content.primaryCta?.href ?? "/dai-ly"}
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
              {content.primaryCta?.label ?? "Đăng ký đại lý"}
            </Link>
            <Link
              href={content.secondaryCta?.href ?? "/lien-he"}
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
              {content.secondaryCta?.label ?? "Liên hệ tư vấn"}
            </Link>
          </div>

          {/* Cluster cross-links */}
          <p
            style={{
              marginTop: "28px",
              fontSize: "13px",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Xem thêm:{" "}
            {content.internalLinks.map((link, i) => (
              <span key={i}>
                {i > 0 && <span> · </span>}
                <Link
                  href={link.href}
                  style={{
                    color: "rgba(255,255,255,0.85)",
                    textDecoration: "underline",
                  }}
                >
                  {link.label}
                </Link>
              </span>
            ))}
          </p>
        </div>
      </section>
    </main>
  );
}

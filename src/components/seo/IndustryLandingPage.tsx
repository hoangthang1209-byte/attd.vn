/**
 * Shared layout component for industry-intent landing pages.
 *
 * Reuses existing SEO schema components (CollectionSchema, FaqSchema, Breadcrumb)
 * and renders the structured page layout for all industry landing pages without
 * duplicating schema code.
 */

import Link from "next/link";
import Breadcrumb from "@/components/seo/Breadcrumb";
import CollectionSchema from "@/components/seo/CollectionSchema";
import FaqSchema from "@/components/seo/FaqSchema";
import type { IndustryContent } from "@/lib/industryContent";

interface IndustryLandingPageProps {
  slug: string;
  content: IndustryContent;
  canonicalUrl: string;
}

// ── Shared inline styles ───────────────────────────────────────────────────

const section: React.CSSProperties = { padding: "56px 0" };
const sectionAlt: React.CSSProperties = {
  padding: "56px 0",
  background: "#f9fafb",
  borderTop: "1px solid #e5e7eb",
};
const container: React.CSSProperties = {
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
const grid: React.CSSProperties = {
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

export default function IndustryLandingPage({
  slug,
  content,
  canonicalUrl,
}: IndustryLandingPageProps) {
  return (
    <main>
      {/* ── Structured Data ────────────────────────────────────────────────── */}
      <CollectionSchema
        title={content.seoTitle}
        description={content.metaDescription}
        url={canonicalUrl}
      />
      <FaqSchema items={content.faq} />

      {/* ── Breadcrumb: visual + BreadcrumbList JSON-LD ────────────────────── */}
      <Breadcrumb
        items={[{ name: content.h1, href: `/${slug}` }]}
      />

      {/* ── SECTION 1: Hero ──────────────────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)",
          padding: "64px 0 56px",
          color: "#fff",
        }}
      >
        <div
          style={{
            ...container,
            maxWidth: "780px",
            textAlign: "center",
          }}
        >
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
              marginBottom: "36px",
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
              Liên hệ tư vấn
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: Introduction ──────────────────────────────────────────── */}
      <section style={sectionAlt}>
        <div style={container}>
          <h2 style={h2Style}>Về {content.h1}</h2>
          <div
            style={{ fontSize: "15px", lineHeight: "1.8", color: "#374151" }}
            dangerouslySetInnerHTML={{ __html: content.intro }}
          />
        </div>
      </section>

      {/* ── SECTION 3: Benefits ──────────────────────────────────────────────── */}
      {content.benefits.length > 0 && (
        <section style={section}>
          <div style={container}>
            <h2 style={h2Style}>Ưu điểm nổi bật</h2>
            <div style={grid}>
              {content.benefits.map((b, i) => (
                <article key={i} style={card}>
                  <h3 style={cardTitle}>{b.title}</h3>
                  <p style={cardDesc}>{b.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 4: Why ATTD ──────────────────────────────────────────────── */}
      {content.whyAttd.length > 0 && (
        <section style={sectionAlt}>
          <div style={container}>
            <h2 style={h2Style}>Tại sao chọn ATTD?</h2>
            <div style={grid}>
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

      {/* ── SECTION 5: Use Cases ─────────────────────────────────────────────── */}
      {content.useCases.length > 0 && (
        <section style={section}>
          <div style={container}>
            <h2 style={h2Style}>Ứng dụng phổ biến</h2>
            <div style={grid}>
              {content.useCases.map((u, i) => (
                <article key={i} style={card}>
                  <h3 style={cardTitle}>{u.title}</h3>
                  <p style={cardDesc}>{u.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 6: Product Categories (internal links) ───────────────────── */}
      {content.productCategories.length > 0 && (
        <section style={sectionAlt}>
          <div style={container}>
            <h2 style={h2Style}>Danh mục sản phẩm</h2>
            <p
              style={{
                fontSize: "15px",
                color: "#4b5563",
                marginBottom: "24px",
                lineHeight: "1.7",
              }}
            >
              Khám phá danh mục sản phẩm phù hợp với nhu cầu của bạn:
            </p>
            <div style={grid}>
              {content.productCategories.map((cat, i) => (
                <Link
                  key={i}
                  href={cat.href}
                  style={{
                    display: "block",
                    ...card,
                    textDecoration: "none",
                    transition: "box-shadow 0.2s",
                  }}
                >
                  <h3
                    style={{
                      ...cardTitle,
                      color: "#1d4ed8",
                      marginBottom: "8px",
                    }}
                  >
                    {cat.name} →
                  </h3>
                  <p style={cardDesc}>{cat.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 7: FAQ ───────────────────────────────────────────────────── */}
      {content.faq.length > 0 && (
        <section style={section}>
          <div style={container}>
            <h2 style={h2Style}>Câu hỏi thường gặp</h2>
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
          ...section,
          background: "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)",
          color: "#fff",
        }}
      >
        <div style={{ ...container, textAlign: "center" }}>
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
              marginBottom: "32px",
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

          {/* Page-specific contextual internal links */}
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

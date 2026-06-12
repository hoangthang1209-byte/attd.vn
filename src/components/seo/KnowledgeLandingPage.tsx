/**
 * Shared layout component for the blank apparel knowledge cluster.
 *
 * Reuses CollectionSchema, FaqSchema, Breadcrumb.
 * Structure: Hero → Introduction → Key Points → Details → FAQ → CTA.
 */

import Link from "next/link";
import Breadcrumb from "@/components/seo/Breadcrumb";
import CollectionSchema from "@/components/seo/CollectionSchema";
import FaqSchema from "@/components/seo/FaqSchema";
import type { KnowledgeContent } from "@/lib/knowledgeContent";

interface KnowledgeLandingPageProps {
  slug: string;
  content: KnowledgeContent;
  canonicalUrl: string;
}

// ── Shared styles ──────────────────────────────────────────────────────────

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

export default function KnowledgeLandingPage({
  slug,
  content,
  canonicalUrl,
}: KnowledgeLandingPageProps) {
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

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(135deg, #0f2942 0%, #155e75 100%)",
          padding: "56px 0 48px",
          color: "#fff",
        }}
      >
        <div style={{ ...ctr, maxWidth: "780px" }}>
          <h1
            style={{
              fontSize: "clamp(22px, 3.5vw, 32px)",
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.3,
              marginBottom: "16px",
            }}
          >
            {content.h1}
          </h1>
          <p
            style={{
              fontSize: "16px",
              lineHeight: "1.75",
              color: "rgba(255,255,255,0.88)",
              marginBottom: "32px",
              maxWidth: "640px",
            }}
          >
            {content.heroIntro}
          </p>
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/lien-he"
              style={{
                display: "inline-block",
                padding: "11px 24px",
                background: "#fff",
                color: "#0f2942",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              Liên hệ tư vấn
            </Link>
            <Link
              href="/ao-thun-tron"
              style={{
                display: "inline-block",
                padding: "11px 24px",
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              Xem sản phẩm →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Introduction ─────────────────────────────────────────────────────── */}
      <section style={secAlt}>
        <div style={ctr}>
          <h2 style={h2}>{content.h1}</h2>
          <div
            style={{ fontSize: "15px", lineHeight: "1.85", color: "#374151" }}
            dangerouslySetInnerHTML={{ __html: content.intro }}
          />
        </div>
      </section>

      {/* ── Key Points ───────────────────────────────────────────────────────── */}
      {content.keyPoints.length > 0 && (
        <section style={sec}>
          <div style={ctr}>
            <h2 style={h2}>Thông tin cần biết</h2>
            <div style={grid}>
              {content.keyPoints.map((kp, i) => (
                <article key={i} style={card}>
                  <h3 style={cardTitle}>{kp.title}</h3>
                  <p style={cardDesc}>{kp.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Details / Applications / Comparisons ────────────────────────────── */}
      {content.details.length > 0 && (
        <section style={secAlt}>
          <div style={ctr}>
            <h2 style={h2}>Ứng dụng và lưu ý thực tế</h2>
            <div style={grid}>
              {content.details.map((d, i) => (
                <article key={i} style={card}>
                  <h3 style={cardTitle}>{d.title}</h3>
                  <p style={cardDesc}>{d.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      {content.faq.length > 0 && (
        <section style={sec}>
          <div style={ctr}>
            <h2 style={h2}>Câu hỏi thường gặp</h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
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

      {/* ── CTA + Internal Links ─────────────────────────────────────────────── */}
      <section
        style={{
          ...secAlt,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <div style={{ ...ctr, textAlign: "center" }}>
          <h2
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#111827",
              marginBottom: "10px",
            }}
          >
            {content.ctaTitle}
          </h2>
          <p
            style={{
              fontSize: "15px",
              color: "#4b5563",
              marginBottom: "28px",
              maxWidth: "560px",
              margin: "0 auto 28px",
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
              marginBottom: "32px",
            }}
          >
            <Link
              href="/dai-ly"
              style={{
                display: "inline-block",
                padding: "12px 26px",
                background: "#1d4ed8",
                color: "#fff",
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
                padding: "12px 26px",
                background: "#fff",
                color: "#1d4ed8",
                border: "1px solid #1d4ed8",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "15px",
                textDecoration: "none",
              }}
            >
              Liên hệ tư vấn
            </Link>
          </div>

          {/* Cluster cross-links */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            {content.internalLinks.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  background: "#f1f5f9",
                  color: "#1d4ed8",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  textDecoration: "none",
                  border: "1px solid #e2e8f0",
                }}
              >
                {link.label} →
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

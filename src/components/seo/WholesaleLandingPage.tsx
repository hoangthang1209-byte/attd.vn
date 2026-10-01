/**
 * Shared layout for the wholesale SEO cluster.
 *
 * Design Language V2 intentionally reuses the same public visual primitives as
 * the marketplace instead of page-specific gradients and inline styles.
 */

import Link from "next/link";
import Breadcrumb from "@/components/seo/Breadcrumb";
import CollectionSchema from "@/components/seo/CollectionSchema";
import FaqSchema from "@/components/seo/FaqSchema";
import MarketplaceRFQStrip from "@/components/marketplace/MarketplaceRFQStrip";
import type { WholesaleContent } from "@/lib/wholesaleContent";

const PRODUCT_CATEGORIES = [
  {
    name: "Áo Thun Trơn",
    href: "/ao-thun-tron",
    desc: "Cotton, CVC và TC đa màu, đủ size cho xưởng in, đồng phục và merchandise.",
  },
  {
    name: "Áo Polo Trơn",
    href: "/ao-polo-tron",
    desc: "Polo trơn cho đồng phục doanh nghiệp, in/thêu logo và chương trình B2B.",
  },
  {
    name: "Nón Trơn",
    href: "/non",
    desc: "Nón lưỡi trai, bucket và các cấu hình phù hợp sự kiện hoặc quà tặng.",
  },
  {
    name: "Túi Tote",
    href: "/tote",
    desc: "Tote canvas và túi vải cho quà tặng, activation và nhu cầu gắn thương hiệu.",
  },
  {
    name: "Bình Giữ Nhiệt",
    href: "/binh-giu-nhiet",
    desc: "Nhóm quà tặng doanh nghiệp phổ biến, hỗ trợ hoàn thiện thương hiệu theo dự án.",
  },
] as const;

interface WholesaleLandingPageProps {
  slug: string;
  content: WholesaleContent;
  canonicalUrl: string;
}

export default function WholesaleLandingPage({
  slug,
  content,
  canonicalUrl,
}: WholesaleLandingPageProps) {
  return (
    <main className="wholesale-landing-v2 v7-seo-landing">
      <CollectionSchema
        title={content.seoTitle}
        description={content.metaDescription}
        url={canonicalUrl}
      />
      <FaqSchema items={content.faq} />

      <Breadcrumb items={[{ name: content.h1, href: `/${slug}` }]} />

      <section className="wholesale-hero">
        <div className="container wholesale-hero__grid">
          <div className="wholesale-hero__copy">
            <p className="public-eyebrow">Nguồn hàng B2B</p>
            <h1 className="wholesale-hero__title">{content.h1}</h1>
            <p className="wholesale-hero__lead">{content.heroIntro}</p>
            <div className="wholesale-hero__actions">
              <Link href={content.primaryCta?.href ?? "/lien-he"} className="btn-primary">
                {content.primaryCta?.label ?? "Yêu cầu báo giá"}
              </Link>
              <Link href={content.secondaryCta?.href ?? "/dai-ly"} className="btn-secondary">
                {content.secondaryCta?.label ?? "Nhận tư vấn"}
              </Link>
            </div>
          </div>

          <aside className="wholesale-hero__decision" aria-label="Thông tin sourcing">
            <p className="wholesale-hero__decision-label">ATTD hỗ trợ</p>
            <dl className="wholesale-hero__decision-list">
              <div>
                <dt>Nguồn hàng</dt>
                <dd>Hàng trơn · đồng phục · quà tặng</dd>
              </div>
              <div>
                <dt>Hoàn thiện</dt>
                <dd>In · thêu · nhãn · đóng gói</dd>
              </div>
              <div>
                <dt>Sản xuất</dt>
                <dd>OEM / Private Label theo yêu cầu</dd>
              </div>
              <div>
                <dt>Báo giá</dt>
                <dd>Theo sản phẩm, số lượng và tiến độ</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="public-editorial-section public-editorial-section--soft">
        <div className="container public-editorial-narrow">
          <p className="public-eyebrow">Tổng quan</p>
          <h2 className="public-section-title">Về {content.h1}</h2>
          <div
            className="wholesale-rich-copy"
            dangerouslySetInnerHTML={{ __html: content.intro }}
          />
        </div>
      </section>

      {content.suitableCustomers.length > 0 ? (
        <section className="public-editorial-section">
          <div className="container">
            <div className="public-section-heading">
              <p className="public-eyebrow">Đối tượng phù hợp</p>
              <h2 className="public-section-title">Phù hợp với nhu cầu nào?</h2>
            </div>
            <div className="public-card-grid public-card-grid--2">
              {content.suitableCustomers.map((item) => (
                <article key={item.title} className="public-info-card">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {content.whyAttd.length > 0 ? (
        <section className="public-editorial-section public-editorial-section--soft">
          <div className="container">
            <div className="public-section-heading">
              <p className="public-eyebrow">Năng lực ATTD</p>
              <h2 className="public-section-title">Tại sao chọn nguồn hàng ATTD?</h2>
            </div>
            <div className="public-card-grid public-card-grid--2">
              {content.whyAttd.map((item) => (
                <article key={item.title} className="public-info-card public-info-card--quiet">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="public-editorial-section">
        <div className="container">
          <div className="public-section-heading public-section-heading--split">
            <div>
              <p className="public-eyebrow">Danh mục</p>
              <h2 className="public-section-title">Nhóm sản phẩm liên quan</h2>
            </div>
            <p className="public-section-copy">
              Chọn nhóm sản phẩm để xem dữ liệu chi tiết, màu, size và khả năng hoàn thiện.
            </p>
          </div>
          <div className="wholesale-category-grid">
            {PRODUCT_CATEGORIES.map((category) => (
              <Link key={category.href} href={category.href} className="wholesale-category-card">
                <span className="wholesale-category-card__arrow" aria-hidden>↗</span>
                <h3>{category.name}</h3>
                <p>{category.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {content.process.length > 0 ? (
        <section className="public-editorial-section public-editorial-section--soft">
          <div className="container">
            <div className="public-section-heading">
              <p className="public-eyebrow">Cách làm việc</p>
              <h2 className="public-section-title">Quy trình hợp tác</h2>
            </div>
            <ol className="public-process-list">
              {content.process.map((step) => (
                <li key={step.step} className="public-process-item">
                  <span className="public-process-item__num">{step.step}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      <MarketplaceRFQStrip />

      {content.faq.length > 0 ? (
        <section className="public-editorial-section">
          <div className="container public-editorial-narrow">
            <div className="public-section-heading">
              <p className="public-eyebrow">FAQ</p>
              <h2 className="public-section-title">Câu hỏi thường gặp</h2>
            </div>
            <div className="faq-list">
              {content.faq.map((item) => (
                <details key={item.question} className="faq-item">
                  <summary>{item.question}</summary>
                  <div className="faq-answer">
                    <p>{item.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="wholesale-final-cta">
        <div className="container wholesale-final-cta__inner">
          <div>
            <p className="public-eyebrow public-eyebrow--inverse">Bắt đầu dự án</p>
            <h2>{content.ctaTitle}</h2>
            <p>{content.ctaDescription}</p>
          </div>
          <div className="wholesale-final-cta__actions">
            <Link href={content.primaryCta?.href ?? "/lien-he"} className="btn-primary">
              {content.primaryCta?.label ?? "Yêu cầu báo giá"}
            </Link>
            <Link href={content.secondaryCta?.href ?? "/dai-ly"} className="btn-secondary">
              {content.secondaryCta?.label ?? "Nhận tư vấn"}
            </Link>
          </div>
          {content.internalLinks.length > 0 ? (
            <nav className="wholesale-final-cta__links" aria-label="Liên kết liên quan">
              {content.internalLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </section>
    </main>
  );
}

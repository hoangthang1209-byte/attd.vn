import Link from "next/link";
import Image from "next/image";
import { getCategoriesWithCounts } from "@/features/categories/services/category.service";
import { getProductsForPublicListing, getPublicCatalogStats } from "@/features/products/services/product.service";
import { getPublishedBlogPosts } from "@/features/blog/services/blog-public.service";
import HeroSection from "@/components/public/HeroSection";
import type { HeroMosaicItem } from "@/components/public/HeroSection";
import CategoryCard from "@/components/public/CategoryCard";
import SocialProofSection from "@/components/public/SocialProofSection";
import ClientLogoWall from "@/components/public/ClientLogoWall";
import CaseStudySection from "@/components/public/CaseStudySection";
import MarketplaceDiscoveryStrip from "@/components/public/MarketplaceDiscoveryStrip";
import ProductCard from "@/components/public/ProductCard";
import { getPrimaryProductImageFromProduct } from "@/lib/productImages";
import { isValidImageSrc } from "@/lib/imagePaths";

export const revalidate = 3600;

/* ── Static content ─────────────────────────────────────────────────────── */

const B2B_AUDIENCES = [
  {
    key: "dai-ly",
    accent: "01",
    title: "Đại lý đồng phục",
    desc: "Nguồn hàng blank ổn định, giá sỉ theo bậc, chính sách đại lý rõ ràng.",
    tags: ["Áo thun trơn", "Áo polo trơn", "Nón đồng phục"],
    href: "/dai-ly",
    cta: "Đăng ký đại lý",
  },
  {
    key: "agency",
    accent: "02",
    title: "Agency quà tặng",
    desc: "Danh mục quà tặng đa dạng, hỗ trợ in logo và đóng gói theo yêu cầu.",
    tags: ["Tote bag", "Bình giữ nhiệt", "Gift set DN"],
    href: "/qua-tang-doanh-nghiep",
    cta: "Xem quà tặng",
  },
  {
    key: "xuong-in",
    accent: "03",
    title: "Xưởng in / thêu",
    desc: "Blank apparel trơn chuẩn chất, tồn kho đa màu, giao nhanh cho đơn sản xuất.",
    tags: ["Áo thun blank", "Nón trơn", "Túi vải"],
    href: "/nguon-hang",
    cta: "Xem nguồn hàng",
  },
  {
    key: "doanh-nghiep",
    accent: "04",
    title: "Doanh nghiệp",
    desc: "Đồng phục, quà tặng onboarding và sự kiện — số lượng lớn, báo giá nhanh.",
    tags: ["Đồng phục", "Onboarding gift", "Quà sự kiện"],
    href: "/lien-he",
    cta: "Liên hệ báo giá",
  },
];

const WHY_ATTD = [
  {
    title: "Số lượng tối thiểu & thời gian giao rõ ràng",
    desc: "Mỗi sản phẩm hiển thị số lượng tối thiểu và thời gian giao/sản xuất ngay trên catalog.",
  },
  {
    title: "Hỗ trợ in / thêu / OEM",
    desc: "Silk-screen, DTG, chuyển nhiệt, thêu vi tính và Private Label theo yêu cầu.",
  },
  {
    title: "Danh mục B2B đa dạng",
    desc: "Áo thun, polo, nón, tote, bình giữ nhiệt, bandana và gift set doanh nghiệp.",
  },
  {
    title: "Dữ liệu sản phẩm đầy đủ",
    desc: "Lựa chọn màu/size, chất liệu, GSM, tình trạng hàng — đủ để tư vấn khách hàng.",
  },
  {
    title: "Báo giá theo số lượng",
    desc: "Giá sỉ điều chỉnh theo bậc số lượng — liên hệ để nhận bảng giá chi tiết.",
  },
  {
    title: "Giao hàng toàn quốc",
    desc: "Hàng tồn kho giao 1–3 ngày. Đơn gia công tùy theo quy mô và yêu cầu.",
  },
];

const SOURCING_STEPS = [
  { n: "01", title: "Chọn sản phẩm", desc: "Duyệt catalog, chọn danh mục và lựa chọn màu/size phù hợp." },
  { n: "02", title: "Gửi báo giá", desc: "Gửi nhu cầu — ATTD phản hồi số lượng tối thiểu, thời gian giao và báo giá sỉ." },
  { n: "03", title: "Kiểm tra kho", desc: "ATTD xác nhận tình trạng hàng, màu sắc và size có sẵn." },
  { n: "04", title: "In / thêu / OEM", desc: "Phối hợp gia công logo theo file thiết kế nếu cần." },
  { n: "05", title: "Giao hàng", desc: "Giao toàn quốc hoặc nhận tại kho theo thỏa thuận." },
];

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function HomePage() {
  const [
    categories,
    { products: featuredProducts },
    { posts: blogPosts },
    catalogStats,
  ] = await Promise.all([
    getCategoriesWithCounts(),
    getProductsForPublicListing({ page: 1, perPage: 12 }),
    getPublishedBlogPosts(1, 4),
    getPublicCatalogStats(),
  ]);

  // Build hero mosaic from first 6 featured products
  const heroMosaicItems: HeroMosaicItem[] = featuredProducts.slice(0, 6).map((p) => ({
    slug: p.category.slug,
    label: p.name,
    description: p.category.name,
    imageUrl: getPrimaryProductImageFromProduct(p),
  }));

  const STOCK_LABELS: Record<string, string> = {
    IN_STOCK: "Còn hàng",
    LOW_STOCK: "Sắp hết",
    OUT_OF_STOCK: "Hết hàng",
  };

  return (
    <main>
      {/* ── 1. Product-first hero ──────────────────────────────────────── */}
      <HeroSection mosaicItems={heroMosaicItems.length ? heroMosaicItems : undefined} />

      {/* ── 2. Social proof strip ─────────────────────────────────────── */}
      <SocialProofSection />

      {/* ── 3. Category marketplace ───────────────────────────────────── */}
      <section className="hp-section hp-section--alt">
        <div className="container">
          <div className="hp-section-header">
            <h2 className="hp-section-title">Tìm nguồn hàng theo danh mục</h2>
            <p className="hp-section-desc">
              Blank apparel và quà tặng doanh nghiệp — nguồn hàng B2B ổn định cho đại lý và xưởng gia công.
            </p>
          </div>
          <div className="hp-market-cats">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                name={cat.name}
                slug={cat.slug}
                imageUrl={cat.imageUrl}
                count={cat._count.products}
                description={cat.description ?? undefined}
                variant="grid"
              />
            ))}
            {/* OEM / Private Label static card */}
            <Link href="/oem" className="market-cat-card market-cat-card--oem">
              <div className="market-cat-card-img">
                <div
                  className="market-cat-card-gradient"
                  style={{ background: "linear-gradient(145deg, #374151, #111827)" }}
                />
                <div className="market-cat-card-overlay" />
              </div>
              <div className="market-cat-card-body">
                <h3 className="market-cat-card-name">OEM / Private Label</h3>
                <p className="market-cat-card-desc">Gia công nhãn hiệu riêng</p>
                <div className="market-cat-card-footer">
                  <span className="market-cat-card-cta">Xem →</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. Featured products ──────────────────────────────────────── */}
      {featuredProducts.length > 0 && (
        <section className="hp-section">
          <div className="container">
            <div className="hp-section-header">
              <div>
                <h2 className="hp-section-title">Sản phẩm sỉ nổi bật</h2>
                <p className="hp-section-desc">
                  Xem nhanh số lượng tối thiểu, thời gian giao/sản xuất, tình trạng hàng
                  và khả năng in/thêu/OEM. Giá liên hệ theo số lượng.
                </p>
              </div>
              <Link href="/san-pham" className="hp-view-all">
                Xem tất cả →
              </Link>
            </div>

            <div className="hp-product-grid">
              {featuredProducts.map((product) => {
                const stockStatuses = product.variants.map((v) => v.stockStatus);
                const stock = stockStatuses.includes("IN_STOCK")
                  ? "IN_STOCK"
                  : stockStatuses.includes("LOW_STOCK")
                  ? "LOW_STOCK"
                  : stockStatuses.length > 0
                  ? "OUT_OF_STOCK"
                  : undefined;
                return (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    slug={product.slug}
                    name={product.name}
                    productCode={product.productCode}
                    skuCount={product.variants.length}
                    category={product.category.name}
                    imageUrl={getPrimaryProductImageFromProduct(product)}
                    moq={product.defaultMoq}
                    leadTime={product.leadTime}
                    stockStatus={stock}
                    stockLabel={stock ? STOCK_LABELS[stock] : undefined}
                    supportsPrinting={product.supportsPrinting}
                    supportsEmbroidery={product.supportsEmbroidery}
                    supportsOem={product.supportsOem}
                  />
                );
              })}
            </div>

            <div className="hp-view-all-row">
              <Link href="/san-pham" className="btn-secondary">
                Xem tất cả sản phẩm sỉ →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── 5. B2B Audience blocks ────────────────────────────────────── */}
      <section className="hp-section hp-section--alt">
        <div className="container">
          <div className="hp-section-header">
            <h2 className="hp-section-title">Nguồn hàng cho từng nhu cầu B2B</h2>
            <p className="hp-section-desc">
              Dù bạn là đại lý, agency, xưởng in hay doanh nghiệp — ATTD có danh mục và chính sách phù hợp.
            </p>
          </div>
          <div className="hp-audience-grid">
            {B2B_AUDIENCES.map((a) => (
              <div key={a.key} className="hp-audience-card">
                <span className="hp-audience-accent">{a.accent}</span>
                <h3 className="hp-audience-title">{a.title}</h3>
                <p className="hp-audience-desc">{a.desc}</p>
                <div className="hp-audience-tags">
                  {a.tags.map((t) => (
                    <span key={t} className="hp-audience-tag">{t}</span>
                  ))}
                </div>
                <Link href={a.href} className="hp-audience-cta">
                  {a.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Marketplace discovery strip ─────────────────────────────── */}
      <MarketplaceDiscoveryStrip
        productCount={catalogStats.productCount}
        variantCount={catalogStats.variantCount}
        categoryCount={catalogStats.categoryCount}
        chips={featuredProducts.map((p) => ({
          slug: p.slug,
          name: p.name,
          imageUrl: getPrimaryProductImageFromProduct(p),
          skuCount: p.variants.length,
        }))}
      />

      {/* ── 6. Why ATTD ──────────────────────────────────────────────── */}
      <section className="hp-section">
        <div className="container">
          <div className="hp-section-header">
            <h2 className="hp-section-title">Vì sao đại lý &amp; agency chọn nguồn hàng từ ATTD?</h2>
          </div>
          <div className="hp-why-grid">
            {WHY_ATTD.map((item, i) => (
              <div key={item.title} className="hp-why-card">
                <span className="hp-why-marker">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="hp-why-title">{item.title}</h3>
                <p className="hp-why-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Sourcing process ───────────────────────────────────────── */}
      <section className="hp-section hp-section--alt hp-section--compact">
        <div className="container">
          <div className="hp-section-header">
            <h2 className="hp-section-title">Quy trình lấy nguồn hàng</h2>
          </div>
          <div className="hp-process-steps">
            {SOURCING_STEPS.map((step, i) => (
              <div key={step.n} className="hp-process-step">
                <div className="hp-process-num">{step.n}</div>
                {i < SOURCING_STEPS.length - 1 && (
                  <div className="hp-process-connector" aria-hidden />
                )}
                <h3 className="hp-process-title">{step.title}</h3>
                <p className="hp-process-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Blog preview ──────────────────────────────────────────── */}
      {blogPosts && blogPosts.length > 0 && (
        <section className="hp-section">
          <div className="container">
            <div className="hp-section-header">
              <div>
                <h2 className="hp-section-title">Kiến thức nguồn hàng B2B</h2>
                <p className="hp-section-desc">
                  Hướng dẫn chọn sản phẩm, chất liệu và chiến lược sourcing cho đại lý.
                </p>
              </div>
              <Link href="/blog" className="hp-view-all">Xem tất cả →</Link>
            </div>
            <div className="hp-blog-grid">
              {blogPosts.slice(0, 4).map((post) => {
                const imgUrl =
                  typeof post.featuredImageUrl === "string" && isValidImageSrc(post.featuredImageUrl)
                    ? post.featuredImageUrl
                    : null;
                const date = post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString("vi-VN", {
                      year: "numeric", month: "long", day: "numeric",
                    })
                  : "";
                return (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="hp-blog-card">
                    <div className="hp-blog-card-img">
                      {imgUrl ? (
                        <Image
                          src={imgUrl}
                          alt={post.title}
                          fill
                          className="hp-blog-card-photo"
                          sizes="(max-width: 640px) 100vw, 300px"
                        />
                      ) : (
                        <div className="hp-blog-card-placeholder" aria-hidden>
                          <span>ATTD</span>
                        </div>
                      )}
                    </div>
                    <div className="hp-blog-card-body">
                      {date && <p className="hp-blog-card-date">{date}</p>}
                      <h3 className="hp-blog-card-title">{post.title}</h3>
                      {post.excerpt && (
                        <p className="hp-blog-card-excerpt">{post.excerpt}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Client logos + Case studies ──────────────────────────────── */}
      <ClientLogoWall />
      <CaseStudySection />

      {/* ── Final CTA ────────────────────────────────────── */}
      <section className="hp-final-cta">
        <div className="container">
          <div className="hp-final-cta-inner">
            <h2 className="hp-final-cta-title">
              Bạn cần nguồn hàng đồng phục hoặc quà tặng doanh nghiệp?
            </h2>
            <p className="hp-final-cta-desc">
              Gửi nhu cầu, ATTD sẽ tư vấn danh mục phù hợp, số lượng tối thiểu,
              thời gian giao/sản xuất và báo giá theo số lượng.
            </p>
            <div className="hp-final-cta-btns">
              <Link href="/lien-he" className="btn-primary">Liên hệ báo giá sỉ</Link>
              <Link href="/dai-ly" className="btn-secondary">Đăng ký đại lý</Link>
              <Link href="/san-pham" className="btn-tertiary">Xem danh mục sản phẩm</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

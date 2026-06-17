import Link from "next/link";
import Image from "next/image";
import { getCategoriesWithCounts } from "@/features/categories/services/category.service";
import { getProductsForPublicListing } from "@/features/products/services/product.service";
import { getPublishedBlogPosts } from "@/features/blog/services/blog-public.service";
import MarketplaceHero from "@/components/marketplace/MarketplaceHero";
import type { MarketplaceHeroTile } from "@/components/marketplace/MarketplaceHero";
import MarketplaceSectionHeader from "@/components/marketplace/MarketplaceSectionHeader";
import MarketplaceRFQStrip from "@/components/marketplace/MarketplaceRFQStrip";
import MarketplaceFinalCta from "@/components/marketplace/MarketplaceFinalCta";
import CategoryCard from "@/components/public/CategoryCard";
import ProductCard from "@/components/public/ProductCard";
import { getPrimaryProductImageFromProduct } from "@/lib/productImages";
import { isValidImageSrc } from "@/lib/imagePaths";

export const revalidate = 3600;

const STATIC_CATEGORIES = [
  { slug: "ao-khoac-dong-phuc", name: "Áo khoác đồng phục", description: "Gió, dù, nỉ đồng phục DN" },
  { slug: "bandana", name: "Khăn bandana", description: "Phụ kiện trơn & in logo" },
  { slug: "gift-set-doanh-nghiep", name: "Gift set doanh nghiệp", description: "Combo quà tặng onboarding" },
];

const B2B_AUDIENCES = [
  {
    key: "dai-ly",
    title: "Đại lý đồng phục",
    desc: "Nguồn hàng blank ổn định, chính sách đại lý rõ ràng, dữ liệu sản phẩm đầy đủ.",
    href: "/dai-ly",
    cta: "Đăng ký đại lý",
    image: "/images/demo/ao-thun-tron.jpg",
  },
  {
    key: "agency",
    title: "Agency quà tặng",
    desc: "Danh mục quà tặng đa dạng, hỗ trợ in logo và đóng gói theo yêu cầu.",
    href: "/qua-tang-doanh-nghiep",
    cta: "Xem quà tặng",
    image: "/images/demo/tote.jpg",
  },
  {
    key: "xuong-in",
    title: "Xưởng in / thêu",
    desc: "Blank apparel trơn chuẩn chất, tồn kho đa màu, giao nhanh cho đơn sản xuất.",
    href: "/nguon-hang",
    cta: "Xem nguồn hàng",
    image: "/images/demo/ao-polo-tron.jpg",
  },
  {
    key: "doanh-nghiep",
    title: "Doanh nghiệp mua số lượng lớn",
    desc: "Đồng phục, quà tặng onboarding và sự kiện — báo giá nhanh theo số lượng.",
    href: "/lien-he",
    cta: "Liên hệ báo giá",
    image: "/images/demo/binh-giu-nhiet.jpg",
  },
];

const WHY_ATTD = [
  { title: "Danh mục sản phẩm dễ bán", desc: "Áo thun, polo, nón, tote, bình giữ nhiệt và gift set cho đại lý." },
  { title: "Số lượng tối thiểu rõ ràng", desc: "Hiển thị ngay trên catalog để tư vấn khách nhanh." },
  { title: "Hỗ trợ in/thêu/OEM", desc: "Phối hợp gia công logo và Private Label theo yêu cầu." },
  { title: "Có dữ liệu sản phẩm để tư vấn", desc: "Màu/size, chất liệu, tình trạng hàng — đủ thông tin B2B." },
  { title: "Hỗ trợ đại lý/agency", desc: "Chính sách đối tác và tư vấn danh mục theo nhu cầu." },
  { title: "Giao hàng toàn quốc", desc: "Hàng tồn kho giao 1–3 ngày, đơn gia công theo thỏa thuận." },
];

const SOURCING_STEPS = [
  { n: "01", title: "Chọn sản phẩm hoặc gửi yêu cầu", desc: "Duyệt catalog hoặc gửi RFQ nếu chưa thấy sản phẩm phù hợp." },
  { n: "02", title: "ATTD kiểm tra tồn kho, MOQ, lead-time", desc: "Xác nhận số lượng tối thiểu và thời gian giao/sản xuất." },
  { n: "03", title: "Tư vấn in/thêu/OEM nếu cần", desc: "Phối hợp gia công logo theo file thiết kế." },
  { n: "04", title: "Chốt báo giá và phương án", desc: "Báo giá sỉ theo số lượng, tồn kho và yêu cầu gia công." },
  { n: "05", title: "Giao hàng hoặc sản xuất theo đơn", desc: "Giao toàn quốc hoặc nhận tại kho theo thỏa thuận." },
];

export default async function HomePage() {
  const [{ products: featuredProducts }, categories, { posts: blogPosts }] =
    await Promise.all([
      getProductsForPublicListing({ page: 1, perPage: 12 }),
      getCategoriesWithCounts(),
      getPublishedBlogPosts(1, 4),
    ]);

  const heroTiles: MarketplaceHeroTile[] = featuredProducts.slice(0, 4).map((p) => ({
    slug: p.category.slug,
    label: p.name,
    description: p.category.name,
    imageUrl: getPrimaryProductImageFromProduct(p),
    href: `/san-pham/${p.slug}`,
  }));

  const categorySlugs = new Set(categories.map((c) => c.slug));
  const extraCategories = STATIC_CATEGORIES.filter((c) => !categorySlugs.has(c.slug));

  const STOCK_LABELS: Record<string, string> = {
    IN_STOCK: "Còn hàng",
    LOW_STOCK: "Sắp hết",
    OUT_OF_STOCK: "Hết hàng",
  };

  return (
    <main className="mp-home">
      <MarketplaceHero tiles={heroTiles.length ? heroTiles : undefined} />

      {/* Category marketplace grid */}
      <section className="mp-section mp-section--alt">
        <div className="container">
          <MarketplaceSectionHeader
            title="Tìm nguồn hàng theo danh mục"
            description="Blank apparel và quà tặng doanh nghiệp — chọn danh mục phù hợp với nhu cầu B2B."
          />
          <div className="mp-category-grid">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                name={cat.name}
                slug={cat.slug}
                imageUrl={cat.imageUrl}
                count={cat._count.products}
                description={cat.description ?? undefined}
                variant="grid"
                ctaLabel="Xem nguồn hàng"
              />
            ))}
            {extraCategories.map((cat) => (
              <CategoryCard
                key={cat.slug}
                name={cat.name}
                slug={cat.slug}
                description={cat.description}
                variant="grid"
                ctaLabel="Xem nguồn hàng"
              />
            ))}
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
                  <span className="market-cat-card-cta">Xem nguồn hàng</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured products */}
      {featuredProducts.length > 0 && (
        <section className="mp-section">
          <div className="container">
            <MarketplaceSectionHeader
              title="Sản phẩm sỉ nổi bật"
              description="Xem số lượng tối thiểu, thời gian giao/sản xuất và tình trạng hàng. Giá liên hệ theo số lượng."
              actionHref="/san-pham"
              actionLabel="Xem tất cả"
            />
            <div className="mp-product-grid">
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
          </div>
        </section>
      )}

      {/* Source by buyer type */}
      <section className="mp-section mp-section--alt">
        <div className="container">
          <MarketplaceSectionHeader
            title="Nguồn hàng theo nhu cầu B2B"
            description="Chọn hướng phù hợp với mô hình kinh doanh của bạn."
          />
          <div className="mp-audience-grid">
            {B2B_AUDIENCES.map((a) => (
              <Link key={a.key} href={a.href} className="mp-audience-card">
                <div className="mp-audience-card-img">
                  {isValidImageSrc(a.image) ? (
                    <Image src={a.image} alt="" fill className="mp-audience-card-photo" sizes="400px" />
                  ) : (
                    <div className="mp-audience-card-fallback" aria-hidden />
                  )}
                </div>
                <div className="mp-audience-card-body">
                  <h3 className="mp-audience-card-title">{a.title}</h3>
                  <p className="mp-audience-card-desc">{a.desc}</p>
                  <span className="mp-audience-card-cta">{a.cta}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <MarketplaceRFQStrip />

      {/* Why ATTD — single trust section */}
      <section className="mp-section">
        <div className="container">
          <MarketplaceSectionHeader
            title="Vì sao chọn nguồn hàng B2B từ ATTD?"
            align="center"
          />
          <div className="mp-why-grid">
            {WHY_ATTD.map((item, i) => (
              <div key={item.title} className="mp-why-card">
                <span className="mp-why-marker">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mp-why-title">{item.title}</h3>
                <p className="mp-why-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="mp-section mp-section--alt">
        <div className="container">
          <MarketplaceSectionHeader title="Quy trình lấy nguồn hàng" />
          <div className="mp-process-grid">
            {SOURCING_STEPS.map((step) => (
              <div key={step.n} className="mp-process-card">
                <span className="mp-process-num">{step.n}</span>
                <h3 className="mp-process-title">{step.title}</h3>
                <p className="mp-process-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog */}
      {blogPosts && blogPosts.length > 0 && (
        <section className="mp-section">
          <div className="container">
            <MarketplaceSectionHeader
              title="Kiến thức nguồn hàng B2B"
              actionHref="/blog"
              actionLabel="Xem tất cả"
            />
            <div className="mp-blog-grid">
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
                  <Link key={post.id} href={`/blog/${post.slug}`} className="mp-blog-card">
                    <div className="mp-blog-card-img">
                      {imgUrl ? (
                        <Image src={imgUrl} alt={post.title} fill className="mp-blog-card-photo" sizes="400px" />
                      ) : (
                        <div className="mp-blog-card-placeholder"><span>ATTD</span></div>
                      )}
                    </div>
                    <div className="mp-blog-card-body">
                      {date && <p className="mp-blog-card-date">{date}</p>}
                      <h3 className="mp-blog-card-title">{post.title}</h3>
                      {post.excerpt && <p className="mp-blog-card-excerpt">{post.excerpt}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <MarketplaceFinalCta />
    </main>
  );
}

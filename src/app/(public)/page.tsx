import Link from "next/link";
import Image from "next/image";
import { getCategoriesWithCounts } from "@/features/categories/services/category.service";
import { getProductsForPublicListing } from "@/features/products/services/product.service";
import { getPublishedBlogPosts } from "@/features/blog/services/blog-public.service";
import { categoryDemoImages } from "@/features/demo/demo-image-map";
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
  { slug: "bandana", name: "Khăn bandana" },
  { slug: "gift-set-doanh-nghiep", name: "Gift set doanh nghiệp" },
];

const B2B_AUDIENCES = [
  {
    key: "dai-ly",
    title: "Đại lý đồng phục",
    href: "/dai-ly",
    imageKey: "ao-thun-tron",
  },
  {
    key: "agency",
    title: "Agency quà tặng",
    href: "/qua-tang-doanh-nghiep",
    imageKey: "tote",
  },
  {
    key: "xuong-in",
    title: "Xưởng in / thêu",
    href: "/nguon-hang",
    imageKey: "ao-polo-tron",
  },
  {
    key: "doanh-nghiep",
    title: "Doanh nghiệp",
    href: "/lien-he",
    imageKey: "binh-giu-nhiet",
  },
];

const WHY_ATTD = [
  "Danh mục dễ bán cho đại lý",
  "Số lượng tối thiểu rõ ràng",
  "Hỗ trợ in/thêu/OEM",
  "Dữ liệu sản phẩm đầy đủ",
  "Hỗ trợ đại lý & agency",
  "Giao hàng toàn quốc",
];

const SOURCING_STEPS = [
  "Chọn sản phẩm hoặc gửi yêu cầu",
  "Kiểm tra tồn kho & MOQ",
  "Tư vấn in/thêu/OEM",
  "Chốt báo giá",
  "Giao hàng / sản xuất",
];

const HERO_MOSAIC_CONFIG: MarketplaceHeroTile[] = [
  { slug: "ao-thun-tron", label: "Áo thun trơn", variant: "featured", href: "/ao-thun-tron" },
  { slug: "ao-polo-tron", label: "Polo", variant: "sm", href: "/ao-polo-tron" },
  { slug: "tote", label: "Tote", variant: "sm", href: "/tote" },
  { slug: "non", label: "Nón", variant: "sm", href: "/non" },
  { slug: "binh-giu-nhiet", label: "Bình giữ nhiệt", variant: "sm", href: "/binh-giu-nhiet" },
];

export default async function HomePage() {
  const [{ products: featuredProducts }, categories, { posts: blogPosts }] =
    await Promise.all([
      getProductsForPublicListing({ page: 1, perPage: 12 }),
      getCategoriesWithCounts(),
      getPublishedBlogPosts(1, 4),
    ]);

  const productImageByCategory = new Map<string, string>();
  for (const p of featuredProducts) {
    if (!productImageByCategory.has(p.category.slug)) {
      const img = getPrimaryProductImageFromProduct(p);
      if (img) productImageByCategory.set(p.category.slug, img);
    }
  }

  const heroTiles = HERO_MOSAIC_CONFIG.map((tile) => ({
    ...tile,
    imageUrl:
      productImageByCategory.get(tile.slug) ??
      categoryDemoImages[tile.slug] ??
      null,
  }));

  const categorySlugs = new Set(categories.map((c) => c.slug));
  const extraCategories = STATIC_CATEGORIES.filter((c) => !categorySlugs.has(c.slug));

  const STOCK_LABELS: Record<string, string> = {
    IN_STOCK: "Còn hàng",
    LOW_STOCK: "Sắp hết",
    OUT_OF_STOCK: "Hết hàng",
  };

  return (
    <main className="mp-home mp-home--v251">
      <MarketplaceHero tiles={heroTiles} />

      <section className="mp-section mp-section--alt mp-section--tight">
        <div className="container">
          <MarketplaceSectionHeader title="Tìm nguồn hàng theo danh mục" />
          <div className="mp-category-grid mp-category-grid--marketplace">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                name={cat.name}
                slug={cat.slug}
                imageUrl={cat.imageUrl ?? categoryDemoImages[cat.slug]}
                count={cat._count.products}
                variant="marketplace"
              />
            ))}
            {extraCategories.map((cat) => (
              <CategoryCard
                key={cat.slug}
                name={cat.name}
                slug={cat.slug}
                imageUrl={categoryDemoImages[cat.slug]}
                variant="marketplace"
              />
            ))}
            <Link href="/oem" className="market-cat-card market-cat-card--marketplace">
              <div className="market-cat-card-img">
                <div
                  className="market-cat-card-gradient"
                  style={{ background: "linear-gradient(145deg, #374151, #111827)" }}
                />
              </div>
              <div className="market-cat-card-body market-cat-card-body--minimal">
                <h3 className="market-cat-card-name">OEM / Private Label</h3>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {featuredProducts.length > 0 && (
        <section className="mp-section mp-section--tight">
          <div className="container">
            <MarketplaceSectionHeader
              title="Sản phẩm sỉ nổi bật"
              actionHref="/san-pham"
              actionLabel="Xem tất cả"
            />
            <div className="mp-product-grid mp-product-grid--compact">
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
                    category={product.category.name}
                    imageUrl={getPrimaryProductImageFromProduct(product)}
                    moq={product.defaultMoq}
                    leadTime={product.leadTime}
                    stockStatus={stock}
                    stockLabel={stock ? STOCK_LABELS[stock] : undefined}
                    compact
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="mp-section mp-section--alt mp-section--tight">
        <div className="container">
          <MarketplaceSectionHeader title="Nguồn hàng theo nhu cầu B2B" />
          <div className="mp-audience-grid mp-audience-grid--visual">
            {B2B_AUDIENCES.map((a) => {
              const img = categoryDemoImages[a.imageKey];
              return (
                <Link key={a.key} href={a.href} className="mp-audience-card mp-audience-card--visual">
                  <div className="mp-audience-card-img">
                    {img && isValidImageSrc(img) ? (
                      <Image src={img} alt="" fill className="mp-audience-card-photo" sizes="400px" />
                    ) : (
                      <div className="mp-audience-card-fallback" aria-hidden />
                    )}
                  </div>
                  <h3 className="mp-audience-card-title">{a.title}</h3>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <MarketplaceRFQStrip />

      <section className="mp-section mp-section--tight">
        <div className="container">
          <MarketplaceSectionHeader title="Vì sao chọn nguồn hàng B2B từ ATTD?" />
          <ul className="mp-why-list">
            {WHY_ATTD.map((item) => (
              <li key={item} className="mp-why-list-item">{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mp-section mp-section--alt mp-section--tight">
        <div className="container">
          <MarketplaceSectionHeader title="Quy trình lấy nguồn hàng" />
          <ol className="mp-process-list">
            {SOURCING_STEPS.map((step, i) => (
              <li key={step} className="mp-process-list-item">
                <span className="mp-process-list-num">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {blogPosts && blogPosts.length > 0 && (
        <section className="mp-section mp-section--tight">
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
                return (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="mp-blog-card">
                    <div className="mp-blog-card-img">
                      {imgUrl ? (
                        <Image src={imgUrl} alt={post.title} fill className="mp-blog-card-photo" sizes="400px" />
                      ) : (
                        <div className="mp-blog-card-placeholder"><span>ATTD</span></div>
                      )}
                    </div>
                    <div className="mp-blog-card-body mp-blog-card-body--minimal">
                      <h3 className="mp-blog-card-title">{post.title}</h3>
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

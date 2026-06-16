import type { Metadata } from "next";
import Link from "next/link";
import { getProductsForPublicListing } from "@/features/products/services/product.service";
import { getCategories } from "@/features/categories/services/category.service";
import ProductCard from "@/components/public/ProductCard";
import EmptyState from "@/components/public/EmptyState";
import Breadcrumb from "@/components/seo/Breadcrumb";
import TrustBlock from "@/components/public/TrustBlock";
import { SITE_NAME, DEFAULT_DESCRIPTION, canonicalUrl } from "@/lib/seo";
import { getPrimaryProductImageFromProduct } from "@/lib/productImages";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Danh sách sản phẩm sỉ | ${SITE_NAME}`,
  description: `Danh mục sản phẩm đồng phục và quà tặng doanh nghiệp sỉ — áo thun, polo, nón, tote bag, bình giữ nhiệt, bandana và gift set. ${DEFAULT_DESCRIPTION}`,
  alternates: { canonical: canonicalUrl("/san-pham") },
};

const STOCK_LABELS: Record<string, string> = {
  IN_STOCK: "Còn hàng",
  LOW_STOCK: "Sắp hết",
  OUT_OF_STOCK: "Hết hàng",
};

type Props = {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
};

export default async function ProductCatalogPage({ searchParams }: Props) {
  const { category, q, page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const [{ products, total, perPage }, categories] = await Promise.all([
    getProductsForPublicListing({ categorySlug: category, search: q, page }),
    getCategories(),
  ]);

  const totalPages = Math.ceil(total / perPage);
  const activeCategory = categories.find((c) => c.slug === category);

  function buildUrl(params: { category?: string; q?: string; page?: number }) {
    const p = new URLSearchParams();
    if (params.category) p.set("category", params.category);
    if (params.q) p.set("q", params.q);
    if (params.page && params.page > 1) p.set("page", String(params.page));
    const qs = p.toString();
    return `/san-pham${qs ? `?${qs}` : ""}`;
  }

  return (
    <main>
      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <Breadcrumb
        items={[
          { name: "Sản phẩm", href: "/san-pham" },
          ...(activeCategory ? [{ name: activeCategory.name }] : []),
        ]}
      />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="catalog-hero">
        <div className="container">
          <div className="catalog-hero-inner">
            <div>
              <h1 className="catalog-hero-title">
                {activeCategory ? activeCategory.name : "Danh mục sản phẩm sỉ"}
              </h1>
              <p className="catalog-hero-desc">
                {activeCategory?.description ??
                  "Nguồn hàng đồng phục & quà tặng B2B — áo thun, polo, nón, tote, bình giữ nhiệt, bandana và gift set cho đại lý, xưởng in, agency và doanh nghiệp."}
              </p>
            </div>
            <TrustBlock variant="strip" />
          </div>
        </div>
      </section>

      {/* ── Filter + Search ──────────────────────────────────────────────── */}
      <section className="catalog-filter-bar">
        <div className="container">
          {/* Category tabs */}
          <div className="catalog-cat-tabs">
            <Link
              href={buildUrl({ q })}
              className={`catalog-cat-tab${!category ? " catalog-cat-tab--active" : ""}`}
            >
              Tất cả
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={buildUrl({ category: cat.slug, q })}
                className={`catalog-cat-tab${category === cat.slug ? " catalog-cat-tab--active" : ""}`}
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {/* Search form */}
          <form method="GET" action="/san-pham" className="catalog-search-form">
            {category && (
              <input type="hidden" name="category" value={category} />
            )}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Tìm tên sản phẩm, mã SKU…"
              className="catalog-search-input"
            />
            <button type="submit" className="catalog-search-btn">
              Tìm kiếm
            </button>
            {(q || category) && (
              <Link href="/san-pham" className="catalog-search-clear">
                ✕ Bỏ lọc
              </Link>
            )}
          </form>

          <p className="catalog-count">
            {total > 0
              ? `${total} sản phẩm${q ? ` cho "${q}"` : ""}${activeCategory ? ` trong ${activeCategory.name}` : ""}`
              : "Không tìm thấy sản phẩm"}
          </p>
        </div>
      </section>

      {/* ── Product Grid ─────────────────────────────────────────────────── */}
      <section className="section-compact">
        <div className="container">
          {products.length === 0 ? (
            <EmptyState
              title={q ? `Không tìm thấy sản phẩm cho "${q}"` : "Chưa có sản phẩm"}
              description="Liên hệ ATTD để được tư vấn nguồn hàng và báo giá."
            />
          ) : (
            <div className="catalog-product-grid">
              {products.map((product) => {
                const stockStatuses = product.variants.map((v) => v.stockStatus);
                const stock =
                  stockStatuses.includes("IN_STOCK")
                    ? "IN_STOCK"
                    : stockStatuses.includes("LOW_STOCK")
                    ? "LOW_STOCK"
                    : stockStatuses.length > 0
                    ? "OUT_OF_STOCK"
                    : null;

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
                    stockStatus={stock ?? undefined}
                    stockLabel={stock ? STOCK_LABELS[stock] : undefined}
                    supportsPrinting={product.supportsPrinting}
                    supportsEmbroidery={product.supportsEmbroidery}
                    supportsOem={product.supportsOem}
                  />
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="catalog-pagination">
              {page > 1 && (
                <Link
                  href={buildUrl({ category, q, page: page - 1 })}
                  className="catalog-page-btn"
                >
                  ← Trang trước
                </Link>
              )}
              <span className="catalog-page-info">
                Trang {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={buildUrl({ category, q, page: page + 1 })}
                  className="catalog-page-btn"
                >
                  Trang tiếp →
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="section-alt section-compact">
        <div className="container" style={{ maxWidth: 680, textAlign: "center" }}>
          <h2 className="section-title" style={{ fontSize: 24, marginBottom: 12 }}>
            Không tìm thấy sản phẩm cần?
          </h2>
          <p className="section-description" style={{ marginBottom: 24 }}>
            ATTD.vn có hơn 100 mã sản phẩm đồng phục và quà tặng — liên hệ để
            được tư vấn nguồn hàng phù hợp.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/lien-he" className="btn-primary">Liên hệ báo giá</Link>
            <Link href="/dai-ly" className="btn-secondary">Đăng ký đại lý</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

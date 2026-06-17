import type { Metadata } from "next";
import Link from "next/link";
import { getProductsForPublicListing } from "@/features/products/services/product.service";
import { getCategoriesWithCounts } from "@/features/categories/services/category.service";
import ProductCard from "@/components/public/ProductCard";
import ProductFilterSidebar from "@/components/marketplace/ProductFilterSidebar";
import MarketplaceSearchBar from "@/components/marketplace/MarketplaceSearchBar";
import MarketplaceSectionHeader from "@/components/marketplace/MarketplaceSectionHeader";
import MarketplaceRFQStrip from "@/components/marketplace/MarketplaceRFQStrip";
import EmptyState from "@/components/public/EmptyState";
import Breadcrumb from "@/components/seo/Breadcrumb";
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
  searchParams: Promise<{
    category?: string;
    q?: string;
    search?: string;
    page?: string;
    inStock?: string;
    print?: string;
    embroidery?: string;
    oem?: string;
    material?: string;
  }>;
};

export default async function ProductCatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const { category, page: pageStr, inStock, print, embroidery, oem, material } = params;
  const q = params.q ?? params.search;
  const page = Math.max(1, Number(pageStr) || 1);

  const filters = {
    inStock: inStock === "1",
    print: print === "1",
    embroidery: embroidery === "1",
    oem: oem === "1",
    material,
  };

  const [{ products, total, perPage }, categories] = await Promise.all([
    getProductsForPublicListing({
      categorySlug: category,
      search: q,
      page,
      ...filters,
    }),
    getCategoriesWithCounts(),
  ]);

  const totalPages = Math.ceil(total / perPage);
  const activeCategory = categories.find((c) => c.slug === category);

  function buildUrl(nextPage?: number) {
    const p = new URLSearchParams();
    if (category) p.set("category", category);
    if (q) p.set("q", q);
    if (filters.inStock) p.set("inStock", "1");
    if (filters.print) p.set("print", "1");
    if (filters.embroidery) p.set("embroidery", "1");
    if (filters.oem) p.set("oem", "1");
    if (material) p.set("material", material);
    if (nextPage && nextPage > 1) p.set("page", String(nextPage));
    const qs = p.toString();
    return `/san-pham${qs ? `?${qs}` : ""}`;
  }

  return (
    <main className="mp-catalog">
      <Breadcrumb
        items={[
          { name: "Sản phẩm", href: "/san-pham" },
          ...(activeCategory ? [{ name: activeCategory.name }] : []),
        ]}
      />

      <section className="mp-catalog-hero">
        <div className="container">
          <MarketplaceSectionHeader
            title={activeCategory ? activeCategory.name : "Kho sản phẩm sỉ B2B"}
            description={
              activeCategory?.description ??
              "Tìm nguồn hàng đồng phục & quà tặng — lọc theo danh mục, tình trạng hàng và khả năng gia công."
            }
          />
          <MarketplaceSearchBar defaultValue={q ?? ""} size="large" />
        </div>
      </section>

      <section className="mp-catalog-body">
        <div className="container">
          <div className="mp-catalog-layout">
            <ProductFilterSidebar
              categories={categories.map((c) => ({
                slug: c.slug,
                name: c.name,
                count: c._count.products,
              }))}
              activeCategory={category}
              searchQuery={q}
              filters={filters}
            />

            <div className="mp-catalog-main">
              <p className="mp-catalog-count">
                {total > 0
                  ? `${total} sản phẩm${q ? ` cho "${q}"` : ""}${activeCategory ? ` · ${activeCategory.name}` : ""}`
                  : "Không tìm thấy sản phẩm"}
              </p>

              {products.length === 0 ? (
                <EmptyState
                  title="Chưa tìm thấy sản phẩm phù hợp"
                  description="Gửi yêu cầu để ATTD gợi ý nguồn hàng theo danh mục, số lượng tối thiểu và thời gian giao/sản xuất."
                />
              ) : (
                <div className="mp-product-grid">
                  {products.map((product) => {
                    const stockStatuses = product.variants.map((v) => v.stockStatus);
                    const stock = stockStatuses.includes("IN_STOCK")
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

              {totalPages > 1 && (
                <div className="mp-catalog-pagination">
                  {page > 1 && (
                    <Link href={buildUrl(page - 1)} className="mp-page-btn">
                      Trang trước
                    </Link>
                  )}
                  <span className="mp-page-info">
                    Trang {page} / {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link href={buildUrl(page + 1)} className="mp-page-btn">
                      Trang tiếp
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <MarketplaceRFQStrip />
    </main>
  );
}

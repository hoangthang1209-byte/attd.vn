import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getProductsForPublicListing } from "@/features/products/services/product.service";
import {
  getCategoryTreeForCatalogFilter,
  resolveCatalogCategoryContext,
} from "@/features/categories/services/category.service";
import ProductCard from "@/components/public/ProductCard";
import { mapPublicProductCardSalesBadges } from "@/features/products/product-sales-badges";
import { mapProductCardAvailableColors } from "@/features/products/product-card-color-swatches";
import CatalogFilterToolbar from "@/components/marketplace/CatalogFilterToolbar";
import CatalogCategoryNav from "@/components/marketplace/CatalogCategoryNav";
import CatalogSortControl from "@/components/marketplace/CatalogSortControl";
import CatalogSourcingCta from "@/components/marketplace/CatalogSourcingCta";
import CatalogSearchTracking from "@/components/analytics/CatalogSearchTracking";
import CatalogEmptyActions from "@/components/marketplace/CatalogEmptyActions";
import MarketplaceSearchBar from "@/components/marketplace/MarketplaceSearchBar";
import MarketplaceRFQStrip from "@/components/marketplace/MarketplaceRFQStrip";
import CatalogSourcingBadges from "@/components/marketplace/CatalogSourcingBadges";
import EmptyState from "@/components/public/EmptyState";
import Breadcrumb from "@/components/seo/Breadcrumb";
import { SITE_NAME, DEFAULT_DESCRIPTION } from "@/lib/seo";
import { buildCatalogMetadata } from "@/lib/seo/indexation-policy";
import { getPrimaryProductImageFromProduct, getProductCardHoverImageFromProduct } from "@/lib/productImages";
import { buildClearFiltersUrl, buildCatalogUrl, removeCatalogFilterParam } from "@/lib/catalog-filter-url";
import { publicCategoryHref } from "@/features/categories/public-category-url";
import { buildCatalogQuickNavCategories } from "@/features/categories/catalog-category-nav.utils";
import { parseCatalogSort } from "@/lib/catalog-sort";
import { getPublicSurfaceMedia } from "@/features/media/public-surface-media";

export const revalidate = 3600;

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
    sort?: string;
  }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  return {
    title: `Danh mục nguồn hàng B2B | ${SITE_NAME}`,
    description: `Khám phá nguồn hàng B2B cho đồng phục, quà tặng, agency, OEM và merchandise — lọc theo danh mục, tồn kho và khả năng hoàn thiện. ${DEFAULT_DESCRIPTION}`,
    ...buildCatalogMetadata(params),
  };
}

export default async function ProductCatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const { category, page: pageStr, inStock, print, embroidery, oem, material, sort: sortParam } = params;
  const q = params.q ?? params.search;
  const page = Math.max(1, Number(pageStr) || 1);
  const sort = parseCatalogSort(sortParam);

  const filters = {
    inStock: inStock === "1",
    print: print === "1",
    embroidery: embroidery === "1",
    oem: oem === "1",
    material,
  };

  const catalogFilters = {
    category,
    q,
    inStock: filters.inStock,
    print: filters.print,
    embroidery: filters.embroidery,
    oem: filters.oem,
    material,
    sort,
  };

  const quickNavBaseFilters = {
    q,
    inStock: filters.inStock,
    print: filters.print,
    embroidery: filters.embroidery,
    oem: filters.oem,
    material,
    sort,
  };

  const [{ products, total, perPage }, categoryTree, categoryContext, catalogMedia] =
    await Promise.all([
      getProductsForPublicListing({
        categorySlug: category,
        search: q,
        page,
        sort,
        ...filters,
      }),
      getCategoryTreeForCatalogFilter(),
      category ? resolveCatalogCategoryContext(category) : Promise.resolve(null),
      getPublicSurfaceMedia("catalog"),
    ]);

  const quickNavCategories = buildCatalogQuickNavCategories(
    categoryTree,
    category,
    quickNavBaseFilters,
  );

  const totalPages = Math.ceil(total / perPage);

  function buildUrl(nextPage?: number) {
    return buildCatalogUrl(catalogFilters, { page: nextPage });
  }

  const pageTitle = categoryContext?.title ?? "Nguồn hàng B2B";
  const pageDescription =
    categoryContext?.subtitle ??
    "Danh sách nguồn hàng đồng phục và quà tặng B2B — lọc theo danh mục, tình trạng hàng và khả năng in/thêu/OEM.";

  const breadcrumbItems = [
    { name: "Sản phẩm", href: "/san-pham" },
    ...(categoryContext?.parentName && categoryContext.parentSlug
      ? [{ name: categoryContext.parentName, href: publicCategoryHref(categoryContext.parentSlug) }]
      : []),
    ...(categoryContext ? [{ name: categoryContext.name }] : []),
  ];

  return (
    <main className="v7-catalog">
      <Breadcrumb items={breadcrumbItems} />

      <section className="v7-catalog-hero">
        <div className="container">
          <div className="v7-catalog-hero__grid">
            <div className="v7-catalog-hero__copy">
              <p className="v7-kicker">Nguồn hàng B2B</p>
              <h1>{pageTitle}</h1>
              <p>{pageDescription}</p>
              <CatalogSourcingBadges />
            </div>

            <div className="v7-catalog-hero__visual">
              {catalogMedia ? (
                <Image
                  src={catalogMedia.url}
                  alt={catalogMedia.alt}
                  fill
                  priority
                  className="v7-catalog-hero__image"
                  sizes="(max-width: 900px) 100vw, 46vw"
                />
              ) : (
                <div className="v7-catalog-hero__fallback">ATTD</div>
              )}
            </div>
          </div>

          <div className="v7-catalog-search">
            <div>
              <span>01 / TÌM NGUỒN HÀNG</span>
              <strong>Tìm theo sản phẩm, mã hàng hoặc chất liệu.</strong>
            </div>
            <MarketplaceSearchBar
              defaultValue={q ?? ""}
              size="large"
              catalogContext={quickNavBaseFilters}
            />
          </div>

          <nav className="v7-catalog-intents" aria-label="Nhu cầu mua hàng">
            <Link href="/san-pham?inStock=1">
              <span>01</span><strong>Hàng có sẵn</strong><small>Ưu tiên tốc độ triển khai</small>
            </Link>
            <Link href="/san-pham?print=1">
              <span>02</span><strong>In logo</strong><small>Sản phẩm hỗ trợ in theo thiết kế</small>
            </Link>
            <Link href="/san-pham?embroidery=1">
              <span>03</span><strong>Thêu</strong><small>Phù hợp đồng phục & branding</small>
            </Link>
            <Link href="/san-pham?oem=1">
              <span>04</span><strong>OEM</strong><small>Phát triển sản phẩm riêng</small>
            </Link>
          </nav>
        </div>
      </section>

      <section className="v7-catalog-body">
        <div className="container">
          <CatalogCategoryNav
            categories={quickNavCategories}
            activeSlug={category}
            title={categoryContext ? `Danh mục · ${categoryContext.parentName ?? "Nguồn hàng"}` : "Danh mục nguồn hàng"}
          />

          <CatalogSearchTracking query={q} resultCount={products.length} />
          <div className="v7-catalog-layout">
            <div className="v7-catalog-main">
              <div className="v7-catalog-results">
                <div className="mp-catalog-results-summary">
                  <p className="mp-catalog-results-kicker">Danh sách sản phẩm</p>
                  <p className="mp-catalog-count">
                    {total > 0
                      ? `${total} sản phẩm${categoryContext ? ` · ${categoryContext.name}` : ""}`
                      : "Không tìm thấy sản phẩm"}
                  </p>
                  {total > 0 && q ? (
                    <p className="mp-catalog-query-context">Từ khóa: “{q}”</p>
                  ) : null}
                  {total > 0 && totalPages > 1 ? (
                    <p className="mp-catalog-query-context">
                      Hiển thị {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} / {total}
                    </p>
                  ) : null}
                </div>
                <div className="mp-catalog-results-controls">
                  <CatalogSortControl filters={catalogFilters} sort={sort} />
                  <CatalogFilterToolbar
                    categoryTree={categoryTree}
                    filters={catalogFilters}
                    categoryLabel={categoryContext?.name ?? null}
                  />
                </div>
              </div>

              {products.length === 0 ? (
                <div className="mp-catalog-empty">
                  <EmptyState
                    title={
                      categoryContext
                        ? `Chưa có sản phẩm trong danh mục "${categoryContext.name}"`
                        : q
                          ? "Không tìm thấy sản phẩm phù hợp"
                          : "Chưa tìm thấy sản phẩm phù hợp"
                    }
                    description={
                      categoryContext
                        ? "Thử chọn danh mục khác hoặc xóa bộ lọc để xem thêm sản phẩm."
                        : q
                          ? `ATTD chưa có kết quả hiển thị cho "${q}". Gửi yêu cầu để đội ngũ tư vấn nguồn hàng phù hợp hơn.`
                          : "Thử điều chỉnh bộ lọc hoặc gửi yêu cầu để ATTD gợi ý nguồn hàng phù hợp."
                    }
                  />
                  <CatalogEmptyActions
                    showClearFilters={Boolean(category || filters.inStock || filters.print || filters.embroidery || filters.oem || material)}
                    clearFiltersHref={buildClearFiltersUrl(q, sort)}
                  />
                </div>
              ) : (
                <div className="mp-product-grid mp-product-grid--catalog">
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
                        hoverImageUrl={getProductCardHoverImageFromProduct(product)}
                        moq={product.defaultMoq}
                        leadTime={product.leadTime}
                        stockStatus={stock ?? undefined}
                        stockLabel={stock ? STOCK_LABELS[stock] : undefined}
                        supportsPrinting={product.supportsPrinting}
                        supportsEmbroidery={product.supportsEmbroidery}
                        supportsOem={product.supportsOem}
                        compact
                        salesBadges={mapPublicProductCardSalesBadges(product)}
                        availableColors={mapProductCardAvailableColors(product)}
                      />
                    );
                  })}
                </div>
              )}

              {totalPages > 1 && (
                <nav className="mp-catalog-pagination" aria-label="Phân trang sản phẩm">
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
                </nav>
              )}

              {products.length > 0 ? (
                <CatalogSourcingCta
                  title="Cần tư vấn nguồn hàng theo nhu cầu?"
                  description="Gửi số lượng, logo và thời gian cần hàng — ATTD gợi ý phương án thay thế hoặc OEM phù hợp ngân sách B2B."
                  primaryLabel="Tư vấn nguồn hàng"
                  secondaryHref={
                    category ? removeCatalogFilterParam(catalogFilters, "category") : "/danh-muc-san-pham"
                  }
                  secondaryLabel={category ? "Xóa bộ lọc danh mục" : "Xem danh mục"}
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <MarketplaceRFQStrip />
    </main>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlug } from "@/features/products/services/product.service";
import ProductImageGallery from "@/components/public/ProductImageGallery";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.seoTitle ?? `${product.name} | ATTD`,
    description:
      product.seoDescription ??
      product.shortDescription ??
      "Nguồn hàng B2B dành cho đại lý, xưởng in và doanh nghiệp.",
    openGraph: {
      title: product.seoTitle ?? product.name,
      description:
        product.seoDescription ??
        product.shortDescription ??
        "Nguồn hàng B2B dành cho đại lý, xưởng in và doanh nghiệp.",
      images: product.images[0]?.imageUrl
        ? [product.images[0].imageUrl]
        : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const uniqueColors = [
    ...new Set(
      product.variants
        .map((v) => v.color?.name)
        .filter((c): c is string => Boolean(c))
    ),
  ];

  const uniqueSizes = [
    ...new Set(
      product.variants
        .map((v) => v.size?.name)
        .filter((s): s is string => Boolean(s))
    ),
  ];

  const skuCount = product.variants.length;

  const stockStatuses = product.variants.map((v) => v.stockStatus);
  const aggregateStock =
    stockStatuses.length === 0
      ? null
      : stockStatuses.includes("IN_STOCK")
      ? "IN_STOCK"
      : stockStatuses.includes("LOW_STOCK")
      ? "LOW_STOCK"
      : "OUT_OF_STOCK";

  const stockLabel =
    aggregateStock === "IN_STOCK"
      ? "Còn hàng"
      : aggregateStock === "LOW_STOCK"
      ? "Sắp hết hàng"
      : aggregateStock === "OUT_OF_STOCK"
      ? "Hết hàng"
      : null;

  const stockColor =
    aggregateStock === "IN_STOCK"
      ? "#16a34a"
      : aggregateStock === "LOW_STOCK"
      ? "#d97706"
      : "#dc2626";

  const hasSpecs = product.gsm || product.material || product.fit;

  return (
    <main>
      {/* Breadcrumb */}
      <div className="container" style={{ paddingTop: "24px" }}>
        <nav
          aria-label="breadcrumb"
          style={{
            fontSize: "14px",
            color: "#6b7280",
            display: "flex",
            gap: "6px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Link href="/" style={{ color: "#6b7280" }}>
            Trang chủ
          </Link>
          <span>/</span>
          <Link
            href={`/${product.category.slug}`}
            style={{ color: "#6b7280" }}
          >
            {product.category.name}
          </Link>
          <span>/</span>
          <span style={{ color: "#111827" }}>{product.name}</span>
        </nav>
      </div>

      {/* Product hero */}
      <section className="section">
        <div className="container">
          <div
            className="grid grid-cols-1 lg:grid-cols-2"
            style={{ gap: "48px" }}
          >
            {/* Image column */}
            <ProductImageGallery
              images={product.images}
              productName={product.name}
            />

            {/* Info column */}
            <div>
              {/* Product code + category */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  marginBottom: "12px",
                  flexWrap: "wrap",
                }}
              >
                {product.productCode && (
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#6b7280",
                      background: "#f3f4f6",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {product.productCode}
                  </span>
                )}
                <Link
                  href={`/${product.category.slug}`}
                  style={{ fontSize: "14px", color: "#6b7280" }}
                >
                  {product.category.name}
                </Link>
              </div>

              <h1
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  margin: "0 0 16px",
                }}
              >
                {product.name}
              </h1>

              {product.shortDescription && (
                <p
                  style={{
                    color: "#6b7280",
                    lineHeight: 1.7,
                    margin: "0 0 24px",
                  }}
                >
                  {product.shortDescription}
                </p>
              )}

              {/* Specs */}
              {hasSpecs && (
                <div
                  className="card"
                  style={{ marginBottom: "24px", padding: "16px" }}
                >
                  <dl
                    style={{
                      margin: 0,
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: "8px 20px",
                      alignItems: "baseline",
                    }}
                  >
                    {product.gsm && (
                      <>
                        <dt style={{ color: "#6b7280", fontSize: "14px", whiteSpace: "nowrap" }}>
                          GSM
                        </dt>
                        <dd style={{ margin: 0, fontWeight: 500 }}>
                          {product.gsm} gsm
                        </dd>
                      </>
                    )}
                    {product.material && (
                      <>
                        <dt style={{ color: "#6b7280", fontSize: "14px", whiteSpace: "nowrap" }}>
                          Chất liệu
                        </dt>
                        <dd style={{ margin: 0, fontWeight: 500 }}>
                          {product.material}
                        </dd>
                      </>
                    )}
                    {product.fit && (
                      <>
                        <dt style={{ color: "#6b7280", fontSize: "14px", whiteSpace: "nowrap" }}>
                          Form
                        </dt>
                        <dd style={{ margin: 0, fontWeight: 500 }}>
                          {product.fit}
                        </dd>
                      </>
                    )}
                  </dl>
                </div>
              )}

              {/* SKU summary */}
              {skuCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    flexWrap: "wrap",
                    fontSize: "14px",
                    color: "#374151",
                    marginBottom: "16px",
                  }}
                >
                  <span>
                    <strong>{skuCount}</strong> SKU
                  </span>
                  {uniqueColors.length > 0 && (
                    <span>
                      <strong>{uniqueColors.length}</strong> màu
                    </span>
                  )}
                  {uniqueSizes.length > 0 && (
                    <span>Size: {uniqueSizes.join(", ")}</span>
                  )}
                </div>
              )}

              {/* Stock status */}
              {stockLabel && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "24px",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: stockColor,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "14px",
                      color: stockColor,
                      fontWeight: 500,
                    }}
                  >
                    {stockLabel}
                  </span>
                </div>
              )}

              {/* Pricing notice */}
              <div
                className="card"
                style={{
                  marginBottom: "32px",
                  padding: "16px",
                  background: "#f9fafb",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#6b7280",
                    lineHeight: 1.6,
                  }}
                >
                  Vui lòng liên hệ để nhận báo giá dành cho đại lý và doanh
                  nghiệp.
                </p>
              </div>

              {/* CTAs */}
              <div
                style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}
              >
                <Link href="/dai-ly" className="btn-primary">
                  Đăng ký đại lý
                </Link>
                <Link href="/lien-he" className="btn-secondary">
                  Liên hệ báo giá
                </Link>
                <a
                  href="https://zalo.me/0000000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  Chat Zalo
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

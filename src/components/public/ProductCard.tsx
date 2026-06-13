import Link from "next/link";

type ProductCardProps = {
  id: string;
  slug: string;
  name: string;
  productCode?: string | null;
  skuCount?: number;
  category?: string;
};

export default function ProductCard({
  slug,
  name,
  productCode,
  skuCount = 0,
  category,
}: ProductCardProps) {
  return (
    <Link href={`/san-pham/${slug}`} className="premium-card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          aspectRatio: "4/5",
          background: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>
          {productCode ?? "ATTD"}
        </span>
      </div>

      <div style={{ padding: "20px 22px 24px" }}>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 12,
            fontWeight: 600,
            color: "#9ca3af",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {category}
        </p>

        <h3
          style={{
            margin: "0 0 12px",
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.45,
            color: "#111827",
            letterSpacing: "-0.01em",
          }}
        >
          {name}
        </h3>

        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
          {skuCount} SKU
        </p>
      </div>
    </Link>
  );
}

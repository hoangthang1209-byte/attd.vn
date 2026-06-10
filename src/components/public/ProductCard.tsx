import Link from "next/link";

type ProductCardProps = {
  id: string;
  name: string;
  productCode?: string | null;
  skuCount?: number;
  category?: string;
};

export default function ProductCard({
  id,
  name,
  productCode,
  skuCount = 0,
  category,
}: ProductCardProps) {
  return (
    <Link
      href={`/san-pham/${id}`}
      style={{
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div
          style={{
            aspectRatio: "1/1",
            background: "#f3f4f6",
          }}
        />

        <div
          style={{
            padding: "16px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            {productCode ?? "ATTD"}
          </div>

          <h3
            style={{
              marginTop: "8px",
              marginBottom: "8px",
            }}
          >
            {name}
          </h3>

          <div
            style={{
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            {category}
          </div>

          <div
            style={{
              marginTop: "12px",
              fontWeight: 600,
            }}
          >
            {skuCount} SKU
          </div>
        </div>
      </div>
    </Link>
  );
}
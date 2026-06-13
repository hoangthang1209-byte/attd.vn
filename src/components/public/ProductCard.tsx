import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
    <Link href={`/san-pham/${slug}`} className="product-card">
      <div className="product-card-media">
        <span className="product-card-code">{productCode ?? "ATTD"}</span>
      </div>

      <div className="product-card-body">
        {category && <p className="product-card-category">{category}</p>}

        <h3 className="product-card-title">{name}</h3>

        <div className="product-card-footer">
          <span className="product-card-meta">{skuCount} SKU</span>
          <span className="product-card-link">
            Xem chi tiết
            <ArrowRight size={14} strokeWidth={2} />
          </span>
        </div>
      </div>
    </Link>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ImagePlaceholder from "@/components/public/ImagePlaceholder";

type ProductCardProps = {
  id: string;
  slug: string;
  name: string;
  productCode?: string | null;
  skuCount?: number;
  category?: string;
  imageUrl?: string | null;
};

export default function ProductCard({
  slug,
  name,
  productCode,
  skuCount = 0,
  category,
  imageUrl,
}: ProductCardProps) {
  return (
    <Link href={`/san-pham/${slug}`} className="product-card">
      <div className="product-card-media">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="product-card-img" />
        ) : (
          <ImagePlaceholder
            variant="product"
            label={productCode ?? undefined}
          />
        )}
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

import ProductCard from "@/components/public/ProductCard";
import MarketplaceSectionHeader from "@/components/marketplace/MarketplaceSectionHeader";
import type { HomepageProductItem } from "@/features/home/homepage.types";

type Props = {
  products: HomepageProductItem[];
};

const AVAILABILITY_STATUS: Record<string, string> = {
  "Còn hàng": "IN_STOCK",
  "Sắp hết": "LOW_STOCK",
  "Hết hàng": "OUT_OF_STOCK",
};

export default function HomeProductDiscoverySection({ products }: Props) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mp-section mp-section--tight">
      <div className="container">
        <MarketplaceSectionHeader
          title="Sản phẩm sỉ nổi bật"
          actionHref="/san-pham"
          actionLabel="Xem tất cả"
        />
        <div className="mp-product-grid mp-product-grid--compact">
          {products.map((product) => {
            const stockLabel = product.availabilityLabel ?? undefined;
            const stockStatus = stockLabel
              ? AVAILABILITY_STATUS[stockLabel]
              : undefined;

            return (
              <ProductCard
                key={product.id}
                id={product.id}
                slug={product.slug}
                name={product.name}
                category={product.categoryName ?? undefined}
                imageUrl={product.imageUrl}
                hoverImageUrl={product.hoverImageUrl}
                moq={product.minimumOrderQuantity}
                leadTime={product.productionLeadTime}
                stockStatus={stockStatus}
                stockLabel={stockLabel}
                compact
                salesBadges={product.salesBadges}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

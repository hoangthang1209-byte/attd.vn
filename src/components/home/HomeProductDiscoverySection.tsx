import Link from "next/link";
import ProductCard from "@/components/public/ProductCard";
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
    <section className="home-product-showcase">
      <div className="container">
        <div className="home-product-showcase__heading">
          <div>
            <p className="public-eyebrow">Sản phẩm nổi bật</p>
            <h2>Nguồn hàng đang được hỏi nhiều</h2>
          </div>
          <div className="home-product-showcase__heading-side">
            <p>Đi thẳng vào sản phẩm để xem màu, MOQ, thời gian và khả năng hoàn thiện.</p>
            <Link href="/san-pham" className="home-product-showcase__all">Xem toàn bộ sản phẩm →</Link>
          </div>
        </div>
        <div className="home-product-showcase__grid">
          {products.map((product) => {
            const stockLabel = product.availabilityLabel ?? undefined;
            const stockStatus = stockLabel
              ? AVAILABILITY_STATUS[stockLabel]
              : undefined;

            return (
              <div key={product.id} className="home-product-showcase__item">
              <ProductCard
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
                supportsPrinting={product.supportsPrinting}
                supportsEmbroidery={product.supportsEmbroidery}
                supportsOem={product.supportsOem}
                compact
                salesBadges={product.salesBadges}
                availableColors={product.availableColors}
              />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

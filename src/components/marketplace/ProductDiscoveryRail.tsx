"use client";

import type { ReactNode } from "react";
import ProductCard from "@/components/public/ProductCard";
import type { ProductDiscoveryCard } from "@/features/products/product-discovery";

type Props = {
  id?: string;
  title: string;
  description?: string;
  products: ProductDiscoveryCard[];
  action?: ReactNode;
};

export default function ProductDiscoveryRail({ id, title, description, products, action }: Props) {
  if (!products.length) return null;

  return (
    <section className="mp-section mp-pdp-section mp-pdp-discovery" id={id}>
      <div className="container">
        <header className="mp-pdp-section-head mp-pdp-discovery__head">
          <div>
            <h2 className="mp-pdp-section-title">{title}</h2>
            {description ? <p className="mp-pdp-section-subtitle">{description}</p> : null}
          </div>
          {action ? <div className="mp-pdp-discovery__action">{action}</div> : null}
        </header>

        <div className="mp-pdp-product-rail">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              slug={product.slug}
              name={product.name}
              productCode={product.productCode}
              category={product.category}
              imageUrl={product.imageUrl}
              hoverImageUrl={product.hoverImageUrl}
              moq={product.moq}
              leadTime={product.leadTime}
              compact
              variant="catalog"
              salesBadges={product.salesBadges}
              availableColors={product.availableColors}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

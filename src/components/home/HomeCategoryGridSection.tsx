import Link from "next/link";
import CategoryCard from "@/components/public/CategoryCard";
import MarketplaceSectionHeader from "@/components/marketplace/MarketplaceSectionHeader";
import type { HomepageCategoryItem } from "@/features/home/homepage.types";

type Props = {
  categories: HomepageCategoryItem[];
};

export default function HomeCategoryGridSection({ categories }: Props) {
  return (
    <section className="mp-section mp-section--alt mp-section--tight">
      <div className="container">
        <MarketplaceSectionHeader title="Tìm nguồn hàng theo danh mục" />
        <div className="mp-category-grid mp-category-grid--marketplace">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              name={category.name}
              slug={category.slug}
              href={category.href}
              imageUrl={category.imageUrl}
              count={category.productCount ?? undefined}
              variant="marketplace"
            />
          ))}
          <Link href="/oem" className="market-cat-card market-cat-card--marketplace">
            <div className="market-cat-card-img">
              <div
                className="market-cat-card-gradient"
                style={{ background: "linear-gradient(145deg, #374151, #111827)" }}
              />
            </div>
            <div className="market-cat-card-body market-cat-card-body--minimal">
              <h3 className="market-cat-card-name">OEM / Private Label</h3>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

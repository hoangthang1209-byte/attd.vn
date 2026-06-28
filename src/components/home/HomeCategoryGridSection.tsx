import CategoryCard from "@/components/public/CategoryCard";
import HomeCategoryViewAllCta from "@/components/home/HomeCategoryViewAllCta";
import MarketplaceSectionHeader from "@/components/marketplace/MarketplaceSectionHeader";
import type { HomepageCategoryItem } from "@/features/home/homepage.types";

type Props = {
  categories: HomepageCategoryItem[];
  showViewAllCta?: boolean;
  visibleCategoryCount?: number;
};

export default function HomeCategoryGridSection({
  categories,
  showViewAllCta = false,
  visibleCategoryCount = 0,
}: Props) {
  return (
    <section id="home-categories" className="mp-section mp-section--alt mp-section--tight">
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
              parentName={category.parentName}
              variant="marketplace"
            />
          ))}
        </div>
        {showViewAllCta && (
          <HomeCategoryViewAllCta visibleCategoryCount={visibleCategoryCount} />
        )}
      </div>
    </section>
  );
}

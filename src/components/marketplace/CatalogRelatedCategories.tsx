import CategoryCard from "@/components/public/CategoryCard";
import type { CatalogNavCategory } from "@/features/categories/catalog-category-nav.utils";

type Props = {
  title: string;
  description?: string;
  categories: CatalogNavCategory[];
};

export default function CatalogRelatedCategories({
  title,
  description,
  categories,
}: Props) {
  if (categories.length === 0) return null;

  return (
    <section className="mp-catalog-related-categories" aria-labelledby="catalog-related-categories-title">
      <div className="mp-catalog-related-categories__header">
        <p className="mp-catalog-results-kicker">Danh mục liên quan</p>
        <h2 id="catalog-related-categories-title" className="mp-category-listing-section-title">
          {title}
        </h2>
        {description ? (
          <p className="mp-category-listing-section-desc">{description}</p>
        ) : null}
      </div>
      <div className="mp-category-grid mp-category-grid--marketplace mp-catalog-related-categories__grid">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            name={category.name}
            slug={category.slug}
            href={category.href}
            imageUrl={category.imageUrl}
            count={category.productCount}
            parentName={category.parentName}
            variant="marketplace"
            ctaLabel="Xem nguồn hàng"
          />
        ))}
      </div>
    </section>
  );
}

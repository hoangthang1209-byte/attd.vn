import Link from "next/link";
import CategoryCard from "@/components/public/CategoryCard";

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  description?: string | null;
  productCount?: number;
};

type Props = {
  categories: CategoryItem[];
  activeSlug?: string;
};

export default function CatalogPopularCategories({
  categories,
  activeSlug,
}: Props) {
  if (categories.length === 0) return null;

  return (
    <section className="catalog-popular-cats">
      <div className="container">
        <p className="catalog-popular-label">Danh mục phổ biến</p>
        <div className="catalog-popular-grid">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              name={cat.name}
              slug={cat.slug}
              imageUrl={cat.imageUrl}
              count={cat.productCount}
              description={cat.description ?? undefined}
              variant="grid"
            />
          ))}
          {!activeSlug && (
            <Link href="/oem" className="market-cat-card market-cat-card--oem catalog-popular-oem">
              <div className="market-cat-card-img">
                <div
                  className="market-cat-card-gradient"
                  style={{ background: "linear-gradient(145deg, #374151, #111827)" }}
                />
                <div className="market-cat-card-overlay" />
              </div>
              <div className="market-cat-card-body">
                <h3 className="market-cat-card-name">OEM / Private Label</h3>
                <p className="market-cat-card-desc">Gia công nhãn hiệu riêng</p>
                <div className="market-cat-card-footer">
                  <span className="market-cat-card-cta">Xem →</span>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

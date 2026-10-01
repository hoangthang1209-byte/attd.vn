import CategoryCard from "@/components/public/CategoryCard";
import HomeCategoryViewAllCta from "@/components/home/HomeCategoryViewAllCta";
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
    <section id="home-categories" className="home-category-editorial">
      <div className="container home-category-editorial__layout">
        <header className="home-category-editorial__intro">
          <p className="public-eyebrow">Danh mục nguồn hàng</p>
          <h2>Tìm theo nhóm sản phẩm, không phải theo menu phức tạp.</h2>
          <p>
            Mỗi danh mục dẫn thẳng tới sản phẩm, MOQ, khả năng in/thêu/OEM và dữ liệu cần để ra quyết định mua hàng.
          </p>
          {showViewAllCta ? (
            <HomeCategoryViewAllCta visibleCategoryCount={visibleCategoryCount} />
          ) : null}
        </header>

        <div className="home-category-editorial__grid">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className={index === 0 ? "home-category-editorial__featured" : undefined}
            >
              <CategoryCard
                name={category.name}
                slug={category.slug}
                href={category.href}
                imageUrl={category.imageUrl}
                count={category.productCount ?? undefined}
                parentName={category.parentName}
                variant="marketplace"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

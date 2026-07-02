import type { Metadata } from "next";
import CategoryCard from "@/components/public/CategoryCard";
import { getPublicCmsCategoryTree } from "@/features/categories/services/category.service";
import { buildPublicCategoryHierarchy } from "@/features/categories/public-category-hierarchy.utils";
import { PUBLIC_ALL_CATEGORIES_PATH } from "@/features/home/homepage-category.constants";
import { canonicalUrl, buildOgImages } from "@/lib/seo";

export const revalidate = 3600;

const PAGE_DESCRIPTION =
  "Khám phá danh mục sản phẩm đồng phục, áo trơn, phụ kiện, quà tặng và giải pháp nguồn hàng cho doanh nghiệp.";

export const metadata: Metadata = {
  title: "Danh mục sản phẩm | ATTD",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: canonicalUrl(PUBLIC_ALL_CATEGORIES_PATH) },
  openGraph: {
    title: "Danh mục sản phẩm | ATTD",
    description: PAGE_DESCRIPTION,
    images: buildOgImages(),
  },
};

export default async function ProductCategoriesPage() {
  const tree = await getPublicCmsCategoryTree();
  const sections = buildPublicCategoryHierarchy(tree);

  return (
    <main className="mp-page mp-page--categories">
      <div className="container">
        <header className="mp-category-index-header">
          <p className="mp-category-index-eyebrow">DANH MỤC SẢN PHẨM</p>
          <h1 className="mp-category-index-title">Danh mục sản phẩm</h1>
          <p className="mp-category-index-desc">{PAGE_DESCRIPTION}</p>
        </header>

        {sections.length === 0 ? (
          <p className="mp-empty-state">Chưa có danh mục hiển thị công khai.</p>
        ) : (
          <div className="mp-category-index">
            {sections.map((section) => (
              <section key={section.id} className="mp-category-index-section">
                <h2 className="mp-category-index-parent">{section.name}</h2>
                <div className="mp-category-grid mp-category-grid--marketplace">
                  {section.children.map((child) => (
                    <CategoryCard
                      key={child.id}
                      name={child.name}
                      slug={child.slug}
                      href={child.href}
                      imageUrl={child.imageUrl}
                      count={child.productCount}
                      variant="marketplace"
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

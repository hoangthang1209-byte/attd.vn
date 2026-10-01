import type { Metadata } from "next";
import Link from "next/link";
import CategoryCard from "@/components/public/CategoryCard";
import Breadcrumb from "@/components/seo/Breadcrumb";
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
    <main className="v7-category-hub">
      <Breadcrumb
        items={[
          { name: "Sản phẩm", href: "/san-pham" },
          { name: "Danh mục" },
        ]}
      />

      <section className="v7-category-hub__hero">
        <div className="container v7-category-hub__hero-grid">
          <div>
            <p className="v7-kicker">Kiến trúc nguồn hàng</p>
            <h1>Danh mục sản phẩm được tổ chức để ra quyết định nhanh hơn.</h1>
          </div>
          <div>
            <p>{PAGE_DESCRIPTION}</p>
            <Link href="/san-pham" className="v7-btn v7-btn--primary">
              Xem toàn bộ nguồn hàng
            </Link>
          </div>
        </div>
      </section>

      <section className="v7-category-hub__body">
        <div className="container">
          {sections.length === 0 ? (
            <p className="mp-empty-state">Chưa có danh mục hiển thị công khai.</p>
          ) : (
            <div className="v7-category-hub__sections">
              {sections.map((section, sectionIndex) => (
                <section key={section.id} className="v7-category-group">
                  <header className="v7-category-group__head">
                    <span>{String(sectionIndex + 1).padStart(2, "0")}</span>
                    <div>
                      <p>Nhóm sản phẩm</p>
                      <h2>{section.name}</h2>
                    </div>
                    <Link href={section.href ?? "/san-pham"}>Xem nhóm ↗</Link>
                  </header>

                  <div className="v7-category-group__grid">
                    {section.children.map((child, index) => (
                      <div
                        key={child.id}
                        className={index === 0 ? "v7-category-group__featured" : undefined}
                      >
                        <CategoryCard
                          name={child.name}
                          slug={child.slug}
                          href={child.href}
                          imageUrl={child.imageUrl}
                          count={child.productCount}
                          variant="marketplace"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

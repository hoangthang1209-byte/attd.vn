import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getCmsCategoryTree } from "@/features/categories/services/category.service";
import { buildPublicCategoryHierarchy } from "@/features/categories/public-category-hierarchy.utils";
import { canonicalUrl, buildOgImages } from "@/lib/seo";
import MarketplaceSectionHeader from "@/components/marketplace/MarketplaceSectionHeader";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Danh mục sản phẩm | ATTD",
  description:
    "Khám phá toàn bộ danh mục nguồn hàng B2B của ATTD — áo thun, áo polo, phụ kiện và quà tặng doanh nghiệp.",
  alternates: { canonical: canonicalUrl("/danh-muc-san-pham") },
  openGraph: {
    title: "Danh mục sản phẩm | ATTD",
    description:
      "Khám phá toàn bộ danh mục nguồn hàng B2B của ATTD — áo thun, áo polo, phụ kiện và quà tặng doanh nghiệp.",
    images: buildOgImages(),
  },
};

export default async function ProductCategoriesPage() {
  const tree = await getCmsCategoryTree();
  const sections = buildPublicCategoryHierarchy(tree);

  return (
    <main className="mp-page mp-page--categories">
      <div className="container">
        <MarketplaceSectionHeader
          title="Danh mục sản phẩm"
          description="Duyệt nguồn hàng B2B theo nhóm danh mục và danh mục con."
        />

        {sections.length === 0 ? (
          <p className="mp-empty-state">Chưa có danh mục hiển thị công khai.</p>
        ) : (
          <div className="mp-category-hierarchy">
            {sections.map((section) => (
              <section key={section.id} className="mp-category-hierarchy__section">
                <h2 className="mp-category-hierarchy__parent">{section.name}</h2>
                <ul className="mp-category-hierarchy__grid">
                  {section.children.map((child) => (
                    <li key={child.id}>
                      <Link href={child.href} className="mp-category-hierarchy__card">
                        <div className="mp-category-hierarchy__card-img">
                          {child.imageUrl ? (
                            <Image
                              src={child.imageUrl}
                              alt={child.name}
                              fill
                              className="mp-category-hierarchy__card-photo"
                              sizes="(max-width: 640px) 50vw, 200px"
                            />
                          ) : (
                            <div className="mp-category-hierarchy__card-fallback" aria-hidden />
                          )}
                        </div>
                        <div className="mp-category-hierarchy__card-body">
                          <h3 className="mp-category-hierarchy__card-name">{child.name}</h3>
                          {child.productCount > 0 && (
                            <p className="mp-category-hierarchy__card-meta">
                              {child.productCount}+ lựa chọn
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

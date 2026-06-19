import Link from "next/link";
import type {
  CatalogCategoryFilterNode,
} from "@/features/categories/services/category.service";

type ProductFilterSidebarProps = {
  categoryTree: CatalogCategoryFilterNode[];
  activeCategory?: string;
  searchQuery?: string;
  filters: {
    inStock?: boolean;
    print?: boolean;
    embroidery?: boolean;
    oem?: boolean;
    material?: string;
  };
};

function buildFilterUrl(
  base: ProductFilterSidebarProps["filters"] & {
    category?: string;
    q?: string;
  },
) {
  const p = new URLSearchParams();
  if (base.category) p.set("category", base.category);
  if (base.q) p.set("q", base.q);
  if (base.inStock) p.set("inStock", "1");
  if (base.print) p.set("print", "1");
  if (base.embroidery) p.set("embroidery", "1");
  if (base.oem) p.set("oem", "1");
  if (base.material) p.set("material", base.material);
  const qs = p.toString();
  return `/san-pham${qs ? `?${qs}` : ""}`;
}

export default function ProductFilterSidebar({
  categoryTree,
  activeCategory,
  searchQuery,
  filters,
}: ProductFilterSidebarProps) {
  const base = { category: activeCategory, q: searchQuery, ...filters };

  const toggles = [
    { key: "inStock" as const, label: "Còn hàng / sắp hết" },
    { key: "print" as const, label: "Hỗ trợ in logo" },
    { key: "embroidery" as const, label: "Hỗ trợ thêu" },
    { key: "oem" as const, label: "Hỗ trợ OEM" },
  ];

  return (
    <aside className="mp-filter-sidebar">
      <div className="mp-filter-block">
        <h3 className="mp-filter-title">Danh mục sản phẩm</h3>
        <ul className="mp-filter-category-tree">
          <li>
            <Link
              href={buildFilterUrl({ ...base, category: undefined })}
              className={`mp-filter-parent${!activeCategory ? " mp-filter-parent--active" : ""}`}
            >
              Tất cả sản phẩm
            </Link>
          </li>

          {categoryTree.map((parent) => {
            const isParentActive = activeCategory === parent.slug;
            const isChildActive = parent.children.some(
              (child) => child.slug === activeCategory,
            );
            const isGroupExpanded = isParentActive || isChildActive;

            return (
              <li key={parent.id} className="mp-filter-category-group">
                <Link
                  href={buildFilterUrl({ ...base, category: parent.slug })}
                  className={`mp-filter-parent${isParentActive ? " mp-filter-parent--active" : ""}`}
                >
                  <span className="mp-filter-parent-label">{parent.name}</span>
                  {parent.productCount > 0 && (
                    <span className="mp-filter-count">{parent.productCount}</span>
                  )}
                </Link>

                {parent.children.length > 0 && (
                  <ul
                    className={`mp-filter-children${isGroupExpanded ? " mp-filter-children--expanded" : ""}`}
                  >
                    {parent.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={buildFilterUrl({ ...base, category: child.slug })}
                          className={`mp-filter-child${activeCategory === child.slug ? " mp-filter-child--active" : ""}`}
                        >
                          <span className="mp-filter-child-label">{child.name}</span>
                          {child.productCount > 0 && (
                            <span className="mp-filter-count">{child.productCount}</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mp-filter-block">
        <h3 className="mp-filter-title">Bộ lọc</h3>
        <ul className="mp-filter-checks">
          {toggles.map((item) => {
            const active = filters[item.key];
            const next = { ...filters, [item.key]: !active };
            return (
              <li key={item.key}>
                <Link
                  href={buildFilterUrl({ ...base, ...next })}
                  className={`mp-filter-check${active ? " mp-filter-check--active" : ""}`}
                >
                  <span className="mp-filter-check-box" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {(activeCategory || searchQuery || Object.values(filters).some(Boolean)) && (
        <Link href="/san-pham" className="mp-filter-clear">
          Xóa bộ lọc
        </Link>
      )}
    </aside>
  );
}

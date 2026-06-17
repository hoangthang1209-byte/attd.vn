import Link from "next/link";

type CategoryOption = {
  slug: string;
  name: string;
  count?: number;
};

type ProductFilterSidebarProps = {
  categories: CategoryOption[];
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
  }
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
  categories,
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
        <h3 className="mp-filter-title">Danh mục</h3>
        <ul className="mp-filter-list">
          <li>
            <Link
              href={buildFilterUrl({ ...base, category: undefined })}
              className={`mp-filter-link${!activeCategory ? " mp-filter-link--active" : ""}`}
            >
              Tất cả
            </Link>
          </li>
          {categories.map((cat) => (
            <li key={cat.slug}>
              <Link
                href={buildFilterUrl({ ...base, category: cat.slug })}
                className={`mp-filter-link${activeCategory === cat.slug ? " mp-filter-link--active" : ""}`}
              >
                {cat.name}
                {cat.count != null && (
                  <span className="mp-filter-count">{cat.count}</span>
                )}
              </Link>
            </li>
          ))}
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

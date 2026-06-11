import { getCategories } from "@/features/categories/services/category.service";
import CategoryForm from "@/components/admin/category-form";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div style={{ padding: "32px", maxWidth: "1200px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "32px" }}>
        Quản lý danh mục
      </h1>

      {/* Existing categories */}
      <section style={{ marginBottom: "48px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
          Danh sách ({categories.length})
        </h2>

        {categories.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: "14px" }}>Chưa có danh mục nào.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px", fontWeight: 600 }}>Tên</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600 }}>Slug</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600 }}>SEO Title</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600 }}>SEO Desc</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600 }}>Image</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600 }}>Hành động</th>
                </tr>
              </thead>

              <tbody>
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                  >
                    <td style={{ padding: "12px" }}>
                      <span style={{ fontWeight: 500 }}>{cat.name}</span>
                    </td>

                    <td style={{ padding: "12px", color: "#6b7280" }}>
                      {cat.slug}
                    </td>

                    <td style={{ padding: "12px", color: "#6b7280" }}>
                      {cat.seoTitle ? (
                        <span title={cat.seoTitle}>
                          {cat.seoTitle.length > 40
                            ? `${cat.seoTitle.slice(0, 40)}…`
                            : cat.seoTitle}
                        </span>
                      ) : (
                        <span style={{ color: "#d1d5db" }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: "12px", color: "#6b7280" }}>
                      {cat.seoDescription ? (
                        <span title={cat.seoDescription}>
                          {cat.seoDescription.length > 50
                            ? `${cat.seoDescription.slice(0, 50)}…`
                            : cat.seoDescription}
                        </span>
                      ) : (
                        <span style={{ color: "#d1d5db" }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: "12px" }}>
                      {cat.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cat.imageUrl}
                          alt={cat.name}
                          style={{
                            width: "40px",
                            height: "40px",
                            objectFit: "cover",
                            borderRadius: "6px",
                            border: "1px solid #e5e7eb",
                          }}
                        />
                      ) : (
                        <span style={{ color: "#d1d5db", fontSize: "13px" }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: "12px" }}>
                      <a
                        href={`/${cat.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "13px",
                          color: "#6b7280",
                          textDecoration: "underline",
                        }}
                      >
                        Xem
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create form */}
      <section>
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>
          Thêm danh mục mới
        </h2>
        <CategoryForm />
      </section>
    </div>
  );
}

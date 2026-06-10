import { notFound } from "next/navigation";
import { getCategories } from "@/features/categories/services/category.service";
import { getProducts } from "@/features/products/services/product.service";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  const categories = await getCategories();

  const currentCategory = categories.find(
    (item) => item.slug === category
  );

  if (!currentCategory) {
    notFound();
  }

  const products = await getProducts();

  const items = products.filter(
    (product) => product.category?.slug === category
  );

  return (
    <main className="section">
      <div className="container">
        <h1 className="section-title">
          {currentCategory.name}
        </h1>

        <p className="section-description">
          Nguồn hàng {currentCategory.name.toLowerCase()} dành cho đại lý, xưởng in và doanh nghiệp.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            marginTop: "32px",
          }}
        >
          {items.map((product) => (
            <div key={product.id} className="card">
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "8px",
                }}
              >
                {product.productCode ?? "ATTD"}
              </div>

              <h3>{product.name}</h3>

              <div style={{ color: "#6b7280" }}>
                {product.variants.length} SKU
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
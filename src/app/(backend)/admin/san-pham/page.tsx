import Link from "next/link";
import ProductForm from "@/components/admin/product-form";
import { getCategories } from "@/features/categories/services/category.service";
import { getProducts } from "@/features/products/services/product.service";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <div>
      <h1>Sản phẩm</h1>

      <ProductForm categories={categories} />

      <hr />

      <table>
        <thead>
          <tr>
            <th>Tên sản phẩm</th>
            <th>Slug</th>
            <th>Danh mục</th>
            <th>Thao tác</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.name}</td>

              <td>{product.slug}</td>

              <td>{product.category?.name}</td>
              <td>
                <Link href={`/admin/san-pham/${product.id}`}>
                  Quản lý
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
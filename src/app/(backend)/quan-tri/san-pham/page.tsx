import { getProducts } from "@/features/products/services/product.service";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div>
      <h1>Sản phẩm</h1>

      <pre>
        {JSON.stringify(products, null, 2)}
      </pre>
    </div>
  );
}
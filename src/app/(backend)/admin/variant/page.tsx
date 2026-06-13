import VariantForm from "@/components/admin/variant-form";
import { getVariantData } from "@/features/variants/services/variant.service";
import { getVariants } from "@/features/variants/services/variant-list.service";

export default async function VariantPage() {
  const { products, colors, sizes } = await getVariantData();

  const variants = await getVariants();

  return (
    <div>
      <h1>Quản lý SKU</h1>

      <VariantForm
        products={products}
        colors={colors}
        sizes={sizes}
      />

      <hr />

      <h2>Danh sách SKU</h2>

      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Sản phẩm</th>
            <th>Màu</th>
            <th>Size</th>
            <th>Giá đại lý</th>
            <th>Giá VIP</th>
          </tr>
        </thead>

        <tbody>
          {variants.length === 0 ? (
            <tr>
              <td colSpan={6}>Chưa có SKU nào</td>
            </tr>
          ) : (
            variants.map((variant) => (
              <tr key={variant.id}>
                <td>{variant.sku}</td>
                <td>{variant.product?.name}</td>
                <td>{variant.color?.name}</td>
                <td>{variant.size?.name}</td>
                <td>{variant.dealerPrice?.toString()}</td>
                <td>{variant.vipPrice?.toString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
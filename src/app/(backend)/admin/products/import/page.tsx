import AdminShell from "@/components/admin/AdminShell";
import ProductBulkImport from "@/components/admin/products/ProductBulkImport";

export default function ProductImportPage() {
  return (
    <AdminShell title="Nhập hàng loạt sản phẩm">
      <ProductBulkImport />
    </AdminShell>
  );
}

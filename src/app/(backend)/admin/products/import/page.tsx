import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductBulkImport from "@/components/admin/products/ProductBulkImport";

export default function ProductImportPage() {
  return (
    <>
      <AdminPageTitle title="Nhập dữ liệu sản phẩm" />
      <ProductBulkImport />
    </>
  );
}

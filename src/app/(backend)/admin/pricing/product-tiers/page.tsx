import AdminShell from "@/components/admin/AdminShell";
import ProductTiersManager from "@/components/admin/pricing/ProductTiersManager";

export default function ProductTiersPage() {
  return (
    <AdminShell title="Bảng giá sản phẩm">
      <ProductTiersManager />
    </AdminShell>
  );
}

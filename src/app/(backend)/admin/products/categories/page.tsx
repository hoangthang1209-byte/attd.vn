import AdminShell from "@/components/admin/AdminShell";
import CategoryAdminManager from "@/components/admin/products/CategoryAdminManager";

export default function ProductCategoriesPage() {
  return (
    <AdminShell title="Danh mục sản phẩm">
      <CategoryAdminManager />
    </AdminShell>
  );
}

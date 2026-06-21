import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CategoryAdminManager from "@/components/admin/products/CategoryAdminManager";

export default function CategoriesPage() {
  return (
    <>
      <AdminPageTitle title={"Danh mục sản phẩm"} />
      <CategoryAdminManager />
    </>
  );
}

import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CategoryAdminManager from "@/components/admin/products/CategoryAdminManager";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Danh mục sản phẩm");

export default function CategoriesPage() {
  return (
    <>
      <AdminPageTitle title={"Danh mục sản phẩm"} />
      <CategoryAdminManager />
    </>
  );
}

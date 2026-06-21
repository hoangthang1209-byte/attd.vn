import AdminPageTitle from "@/components/admin/AdminPageTitle";
import BlogCategoriesManager from "@/components/admin/BlogCategoriesManager";

export default function BlogCategoriesAdminPage() {
  return (
    <>
      <AdminPageTitle title={"Blog — Danh mục"} />
      <BlogCategoriesManager />
    </>
  );
}

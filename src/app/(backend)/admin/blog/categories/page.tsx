import AdminShell from "@/components/admin/AdminShell";
import BlogCategoriesManager from "@/components/admin/BlogCategoriesManager";

export default function BlogCategoriesAdminPage() {
  return (
    <AdminShell title="Blog — Danh mục">
      <BlogCategoriesManager />
    </AdminShell>
  );
}

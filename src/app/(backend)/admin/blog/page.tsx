import AdminShell from "@/components/admin/AdminShell";
import BlogPostsManager from "@/components/admin/BlogPostsManager";

export default function BlogAdminPage() {
  return (
    <AdminShell title="Blog — Quản lý bài viết">
      <BlogPostsManager />
    </AdminShell>
  );
}

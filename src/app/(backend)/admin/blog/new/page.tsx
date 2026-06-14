import AdminShell from "@/components/admin/AdminShell";
import BlogPostEditor from "@/components/admin/BlogPostEditor";

export default function NewBlogPostPage() {
  return (
    <AdminShell title="Blog — Bài viết mới">
      <BlogPostEditor mode="create" />
    </AdminShell>
  );
}

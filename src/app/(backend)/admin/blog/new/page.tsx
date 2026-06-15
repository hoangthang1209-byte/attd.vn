import { Suspense } from "react";
import AdminShell from "@/components/admin/AdminShell";
import BlogPostEditor from "@/components/admin/BlogPostEditor";

export default function NewBlogPostPage() {
  return (
    <AdminShell title="Blog — Bài viết mới">
      <Suspense fallback={<p className="admin-loading">Đang tải editor…</p>}>
        <BlogPostEditor mode="create" />
      </Suspense>
    </AdminShell>
  );
}

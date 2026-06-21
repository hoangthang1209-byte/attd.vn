import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import BlogPostEditor from "@/components/admin/BlogPostEditor";

export default function NewBlogPostPage() {
  return (
    <>
      <AdminPageTitle title={"Blog — Bài viết mới"} />
      <Suspense fallback={<p className="admin-loading">Đang tải editor…</p>}>
        <BlogPostEditor mode="create" />
      </Suspense>
    </>
  );
}

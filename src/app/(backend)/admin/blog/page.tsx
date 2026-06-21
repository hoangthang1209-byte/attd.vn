import AdminPageTitle from "@/components/admin/AdminPageTitle";
import BlogPostsManager from "@/components/admin/BlogPostsManager";

export default function BlogAdminPage() {
  return (
    <>
      <AdminPageTitle title={"Blog — Quản lý bài viết"} />
      <BlogPostsManager />
    </>
  );
}

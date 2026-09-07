import AdminPageTitle from "@/components/admin/AdminPageTitle";
import BlogPostsManager from "@/components/admin/BlogPostsManager";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Blog");

export default function BlogAdminPage() {
  return (
    <>
      <AdminPageTitle title={"Blog — Quản lý bài viết"} />
      <BlogPostsManager />
    </>
  );
}

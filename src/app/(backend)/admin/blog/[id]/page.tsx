import { notFound } from "next/navigation";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import BlogPostEditor from "@/components/admin/BlogPostEditor";
import { getBlogPostById } from "@/features/blog/services/blog-admin.service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditBlogPostPage({ params }: PageProps) {
  const { id } = await params;
  const post = await getBlogPostById(id);
  if (!post) notFound();

  return (
    <>
      <AdminPageTitle title={`Blog — ${post.title}`} />
      <BlogPostEditor mode="edit" post={post} />
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostByIdForAdmin } from "@/features/posts/services/post.service";
import PostForm from "@/components/admin/PostForm";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPostByIdForAdmin(id);

  if (!post) notFound();

  return (
    <div style={{ padding: "32px", maxWidth: "900px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link
          href="/quan-tri/bai-viet"
          style={{ fontSize: "14px", color: "#6b7280", textDecoration: "none" }}
        >
          ← Quay lại danh sách
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "32px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 4px" }}>
            Chỉnh sửa bài viết
          </h1>
          <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>
            {post.slug}
          </p>
        </div>

        {post.status === "PUBLISHED" && (
          <a
            href={`/blog/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "8px 16px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "13px",
              color: "#374151",
              textDecoration: "none",
            }}
          >
            Xem trang →
          </a>
        )}
      </div>

      <PostForm
        mode="edit"
        post={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          imageUrl: post.imageUrl,
          status: post.status,
          seoTitle: post.seoTitle,
          seoDescription: post.seoDescription,
        }}
      />
    </div>
  );
}

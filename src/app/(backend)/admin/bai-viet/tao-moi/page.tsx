import Link from "next/link";
import PostForm from "@/components/admin/PostForm";

export default function CreatePostPage() {
  return (
    <div style={{ padding: "32px", maxWidth: "900px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link
          href="/admin/bai-viet"
          style={{ fontSize: "14px", color: "#6b7280", textDecoration: "none" }}
        >
          ← Quay lại danh sách
        </Link>
      </div>

      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "32px" }}>
        Tạo bài viết mới
      </h1>

      <PostForm mode="create" />
    </div>
  );
}

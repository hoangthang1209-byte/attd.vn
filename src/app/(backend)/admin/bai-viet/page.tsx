import Link from "next/link";
import { getAllPostsForAdmin } from "@/features/posts/services/post.service";
import DeletePostButton from "@/components/admin/DeletePostButton";

export default async function AdminPostsPage() {
  const posts = await getAllPostsForAdmin();

  return (
    <div style={{ padding: "32px", maxWidth: "1100px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>
          Quản lý bài viết
        </h1>

        <Link
          href="/admin/bai-viet/tao-moi"
          style={{
            padding: "10px 20px",
            background: "#111827",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          + Tạo bài viết
        </Link>
      </div>

      {posts.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: "14px" }}>
          Chưa có bài viết nào.{" "}
          <Link href="/admin/bai-viet/tao-moi" style={{ color: "#374151" }}>
            Tạo ngay
          </Link>
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid #e5e7eb",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Tiêu đề</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Slug</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Trạng thái</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Ngày tạo</th>
                <th style={{ padding: "10px 12px", fontWeight: 600 }}>Hành động</th>
              </tr>
            </thead>

            <tbody>
              {posts.map((post) => (
                <tr
                  key={post.id}
                  style={{ borderBottom: "1px solid #f3f4f6" }}
                >
                  <td style={{ padding: "12px" }}>
                    <span style={{ fontWeight: 500 }}>{post.title}</span>
                  </td>

                  <td style={{ padding: "12px", color: "#6b7280" }}>
                    {post.slug}
                  </td>

                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background:
                          post.status === "PUBLISHED" ? "#dcfce7" : "#f3f4f6",
                        color:
                          post.status === "PUBLISHED" ? "#16a34a" : "#6b7280",
                      }}
                    >
                      {post.status === "PUBLISHED" ? "Đã xuất bản" : "Nháp"}
                    </span>
                  </td>

                  <td style={{ padding: "12px", color: "#6b7280", fontSize: "13px" }}>
                    {new Intl.DateTimeFormat("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }).format(new Date(post.createdAt))}
                  </td>

                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <Link
                        href={`/admin/bai-viet/${post.id}/chinh-sua`}
                        style={{
                          fontSize: "13px",
                          color: "#374151",
                          textDecoration: "underline",
                        }}
                      >
                        Sửa
                      </Link>

                      {post.status === "PUBLISHED" && (
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            textDecoration: "underline",
                          }}
                        >
                          Xem
                        </a>
                      )}

                      <DeletePostButton id={post.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

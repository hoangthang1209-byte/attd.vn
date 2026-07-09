"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ButtonLoading } from "@/components/ui/loading/ContextLoading";

export default function DeletePostButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Xoá bài viết này? Hành động không thể hoàn tác.")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data: unknown = await res.json();
        const msg =
          data &&
          typeof data === "object" &&
          "message" in data &&
          typeof (data as { message: unknown }).message === "string"
            ? (data as { message: string }).message
            : "Không thể xoá bài viết.";
        alert(msg);
      }
    } catch {
      alert("Lỗi kết nối.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      style={{
        padding: "4px 12px",
        background: "transparent",
        color: "#ef4444",
        border: "1px solid #fecaca",
        borderRadius: "6px",
        fontSize: "13px",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? <ButtonLoading title="Đang xóa bài viết…" tone="admin" size="sm" /> : "Xoá"}
    </button>
  );
}

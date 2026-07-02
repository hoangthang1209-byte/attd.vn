"use client";

type AdminInlineLoaderProps = {
  message?: string;
};

export default function AdminInlineLoader({
  message = "Đang cập nhật báo cáo…",
}: AdminInlineLoaderProps) {
  return (
    <p className="admin-loading" role="status" aria-live="polite">
      {message}
    </p>
  );
}

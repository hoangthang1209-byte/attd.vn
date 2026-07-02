"use client";

export default function AdminPageSkeleton({ message = "Đang tải..." }: { message?: string }) {
  return (
    <div className="admin-panel">
      <p className="admin-loading">{message}</p>
    </div>
  );
}

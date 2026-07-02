"use client";

export default function AdminSectionSkeleton({ message = "Đang tải dữ liệu…" }: { message?: string }) {
  return (
    <section className="admin-section-card">
      <p className="admin-loading">{message}</p>
    </section>
  );
}

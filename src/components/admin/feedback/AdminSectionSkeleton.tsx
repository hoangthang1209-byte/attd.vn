"use client";
import { SectionLoading } from "@/components/ui/loading/ContextLoading";

export default function AdminSectionSkeleton({ message = "Đang tải dữ liệu…" }: { message?: string }) {
  return (
    <section className="admin-section-card">
      <SectionLoading title={message} description="Đang chuẩn bị khu vực làm việc..." tone="admin" />
    </section>
  );
}

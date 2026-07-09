"use client";
import { PageLoading } from "@/components/ui/loading/ContextLoading";

export default function AdminPageSkeleton({ message = "Đang tải..." }: { message?: string }) {
  return (
    <div className="admin-panel">
      <PageLoading
        title={message}
        description="Vui lòng chờ trong giây lát, hệ thống đang tải dữ liệu vận hành."
        tone="admin"
      />
    </div>
  );
}

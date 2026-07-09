import { PageLoading } from "@/components/ui/loading/ContextLoading";

export default function AdminOperationsLoading() {
  return (
    <PageLoading
      title="Đang tải dữ liệu vận hành..."
      description="Hệ thống đang tổng hợp trạng thái sản xuất và giao vận."
      tone="admin"
    />
  );
}

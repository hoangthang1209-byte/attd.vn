import { PageLoading } from "@/components/ui/loading/ContextLoading";

export default function AdminOrdersLoading() {
  return (
    <PageLoading
      title="Đang tải danh sách đơn hàng..."
      description="Hệ thống đang cập nhật dữ liệu đơn hàng mới nhất."
      tone="admin"
    />
  );
}

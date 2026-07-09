import { PageLoading } from "@/components/ui/loading/ContextLoading";

export default function AdminOrderDetailLoading() {
  return (
    <PageLoading
      title="Đang tải chi tiết đơn hàng..."
      description="Đang tổng hợp thông tin vận hành đơn hàng."
      tone="admin"
    />
  );
}

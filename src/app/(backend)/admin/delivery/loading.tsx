import { PageLoading } from "@/components/ui/loading/ContextLoading";

export default function AdminDeliveryLoading() {
  return (
    <PageLoading
      title="Đang tải dữ liệu giao vận..."
      description="Đang chuẩn bị bảng điều hành giao hàng."
      tone="admin"
    />
  );
}

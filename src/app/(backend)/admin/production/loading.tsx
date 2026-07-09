import { PageLoading } from "@/components/ui/loading/ContextLoading";

export default function AdminProductionLoading() {
  return (
    <PageLoading
      title="Đang tải bảng sản xuất..."
      description="Đang đồng bộ tiến độ các công đoạn."
      tone="admin"
    />
  );
}

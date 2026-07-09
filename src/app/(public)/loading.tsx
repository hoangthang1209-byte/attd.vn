import { PageLoading } from "@/components/ui/loading/ContextLoading";

export default function PublicLoading() {
  return (
    <PageLoading
      title="Đang tải thông tin trang..."
      description="Nội dung đang được chuẩn bị cho bạn."
      tone="public"
      size="lg"
      className="public-loading"
    />
  );
}

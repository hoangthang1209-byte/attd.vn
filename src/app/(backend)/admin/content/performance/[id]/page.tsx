import { Suspense } from "react";
import AdminSectionSkeleton from "@/components/admin/feedback/AdminSectionSkeleton";
import ContentPerformanceDetailClient from "@/components/admin/content/ContentPerformanceDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function ContentPerformanceDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense fallback={<AdminSectionSkeleton message="Đang tải chi tiết hiệu quả…" />}>
      <ContentPerformanceDetailClient blogId={id} />
    </Suspense>
  );
}

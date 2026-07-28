import { Suspense } from "react";
import AdminSectionSkeleton from "@/components/admin/feedback/AdminSectionSkeleton";
import ContentPerformanceClient from "@/components/admin/content/ContentPerformanceClient";

export default function ContentPerformancePage() {
  return (
    <Suspense fallback={<AdminSectionSkeleton message="Đang tải hiệu quả nội dung…" />}>
      <ContentPerformanceClient />
    </Suspense>
  );
}

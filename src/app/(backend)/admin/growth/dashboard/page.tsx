import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import GrowthDashboardClient from "@/components/admin/growth/GrowthDashboardClient";
import { SectionLoading } from "@/components/ui/loading/ContextLoading";

export default function GrowthDashboardPage() {
  return (
    <>
      <AdminPageTitle title="Growth Engine — Doanh thu theo kênh" />
      <Suspense
        fallback={
          <SectionLoading
            title="Đang tải dashboard..."
            description="Hệ thống đang tổng hợp lead, báo giá và đơn hàng theo kênh."
            tone="admin"
          />
        }
      >
        <GrowthDashboardClient />
      </Suspense>
    </>
  );
}

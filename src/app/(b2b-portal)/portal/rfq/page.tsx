import PortalBusinessGuard from "@/components/portal/PortalBusinessGuard";
import PortalRfqList from "@/components/portal/PortalRfqList";
import { Suspense } from "react";
import { SectionLoading } from "@/components/ui/loading/ContextLoading";

export default function PortalRfqPage() {
  return (
    <PortalBusinessGuard>
      <Suspense
        fallback={
          <SectionLoading
            title="Đang tải danh sách RFQ…"
            description="Hệ thống đang đồng bộ yêu cầu báo giá của bạn."
            tone="dealer"
          />
        }
      >
        <PortalRfqList />
      </Suspense>
    </PortalBusinessGuard>
  );
}

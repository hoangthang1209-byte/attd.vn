import PortalBusinessGuard from "@/components/portal/PortalBusinessGuard";
import PortalRfqList from "@/components/portal/PortalRfqList";
import { Suspense } from "react";

export default function PortalRfqPage() {
  return (
    <PortalBusinessGuard>
      <Suspense fallback={<p style={{ color: "#737373" }}>Đang tải…</p>}>
        <PortalRfqList />
      </Suspense>
    </PortalBusinessGuard>
  );
}

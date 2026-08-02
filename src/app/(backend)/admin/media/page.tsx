import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import MediaLibraryClient from "@/components/admin/MediaLibraryClient";
import CmsDiagnosticsPanel from "@/components/admin/CmsDiagnosticsPanel";
import { getCmsHealth } from "@/features/admin/services/cms-health.service";
import { InlineLoading } from "@/components/ui/loading/ContextLoading";

export default async function MediaPage() {
  const health = await getCmsHealth();

  return (
    <>
      <AdminPageTitle title={"Thư viện ảnh"} />
      <CmsDiagnosticsPanel health={health} />
      <Suspense fallback={<InlineLoading title="Đang tải thư viện…" />}>
        <MediaLibraryClient cmsReady={health.ready} />
      </Suspense>
    </>
  );
}

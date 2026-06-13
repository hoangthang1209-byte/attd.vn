import AdminShell from "@/components/admin/AdminShell";
import MediaLibraryClient from "@/components/admin/MediaLibraryClient";
import CmsDiagnosticsPanel from "@/components/admin/CmsDiagnosticsPanel";
import { getCmsHealth } from "@/features/admin/services/cms-health.service";

export default async function MediaPage() {
  const health = await getCmsHealth();

  return (
    <AdminShell title="Thư viện ảnh">
      <CmsDiagnosticsPanel health={health} />
      <MediaLibraryClient cmsReady={health.ready} />
    </AdminShell>
  );
}

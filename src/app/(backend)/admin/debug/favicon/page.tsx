import AdminShell from "@/components/admin/AdminShell";
import FaviconDebugPanel from "@/components/admin/FaviconDebugPanel";

export default function FaviconDebugPage() {
  return (
    <AdminShell title="Favicon diagnostics">
      <FaviconDebugPanel />
    </AdminShell>
  );
}

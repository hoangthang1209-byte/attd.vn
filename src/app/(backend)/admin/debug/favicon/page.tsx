import AdminPageTitle from "@/components/admin/AdminPageTitle";
import FaviconDebugPanel from "@/components/admin/FaviconDebugPanel";

export default function FaviconDebugPage() {
  return (
    <>
      <AdminPageTitle title={"Favicon diagnostics"} />
      <FaviconDebugPanel />
    </>
  );
}

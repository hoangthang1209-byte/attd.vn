import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { getAdminAuthStatusMessage } from "@/lib/admin-auth/config";

export default function AdminLoginPage() {
  const configWarning = getAdminAuthStatusMessage();
  return <AdminLoginForm configWarning={configWarning} />;
}

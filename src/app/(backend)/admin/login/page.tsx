import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { getAdminAuthStatusMessage } from "@/lib/admin-auth/config";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Đăng nhập");

export default async function AdminLoginPage() {
  const configWarning = getAdminAuthStatusMessage();
  return <AdminLoginForm configWarning={configWarning} />;
}

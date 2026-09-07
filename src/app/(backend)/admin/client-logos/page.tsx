import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ClientLogosManager from "@/components/admin/ClientLogosManager";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Logo khách hàng");

export default function ClientLogosPage() {
  return (
    <>
      <AdminPageTitle title={"Logo khách hàng & đối tác"} />
      <ClientLogosManager />
    </>
  );
}

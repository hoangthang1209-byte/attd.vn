import AdminPageTitle from "@/components/admin/AdminPageTitle";
import SiteNavigationAdminManager from "@/components/admin/site-navigation/SiteNavigationAdminManager";
import { getSiteNavigationCmsConfig, isSiteNavigationTableReady } from "@/features/site-navigation/site-navigation.service";
import { requireAdminPermissionPage } from "@/lib/admin-auth/require-admin-permission";

export default async function SiteNavigationAdminPage() {
  await requireAdminPermissionPage("cms.manage");
  const tableReady = await isSiteNavigationTableReady();
  const cms = tableReady ? await getSiteNavigationCmsConfig() : null;

  return (
    <>
      <AdminPageTitle title="Điều hướng và Footer" />
      <SiteNavigationAdminManager initialCms={cms} tableReady={tableReady} />
    </>
  );
}

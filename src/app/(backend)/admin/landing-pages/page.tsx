import AdminPageTitle from "@/components/admin/AdminPageTitle";
import LandingPagesManager from "@/components/admin/LandingPagesManager";
import {
  ensureLandingPagesSeeded,
  isLandingPageTableReady,
} from "@/features/landing-pages/services/landing-page.service";

export default async function LandingPagesAdminPage() {
  const tableReady = await isLandingPageTableReady();
  if (tableReady) {
    await ensureLandingPagesSeeded();
  }

  return (
    <>
      <AdminPageTitle title={"Landing pages (SEO)"} />
      <LandingPagesManager />
    </>
  );
}

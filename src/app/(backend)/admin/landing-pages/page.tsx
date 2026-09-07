import AdminPageTitle from "@/components/admin/AdminPageTitle";
import LandingPagesManager from "@/components/admin/LandingPagesManager";
import {
  ensureLandingPagesSeeded,
  isLandingPageTableReady,
} from "@/features/landing-pages/services/landing-page.service";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Landing Page");

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

import AdminPageTitle from "@/components/admin/AdminPageTitle";
import HomepageHeroSettingsForm from "@/components/admin/HomepageHeroSettingsForm";
import HomepageProofSettingsForm from "@/components/admin/HomepageProofSettingsForm";
import HomepagePathwaysSettingsForm from "@/components/admin/HomepagePathwaysSettingsForm";
import HomepageOemSettingsForm from "@/components/admin/HomepageOemSettingsForm";
import HomepageCompanyRealitySettingsForm from "@/components/admin/HomepageCompanyRealitySettingsForm";
import HomepageWorkshopGallerySettingsForm from "@/components/admin/HomepageWorkshopGallerySettingsForm";
import HomepageSectionsSettingsForm from "@/components/admin/HomepageSectionsSettingsForm";
import { getHomepageCmsConfig } from "@/features/home/homepage.service";

export default async function HomepageSettingsPage() {
  const cms = await getHomepageCmsConfig();

  return (
    <>
      <AdminPageTitle title="Nội dung trang chủ" />
      <HomepageHeroSettingsForm initial={cms.hero} />
      <HomepageProofSettingsForm initial={cms.proofStrip.items} />
      <HomepagePathwaysSettingsForm initial={cms.sourcingPathways.items} />
      <HomepageOemSettingsForm initial={cms.oemBanner} />
      <HomepageCompanyRealitySettingsForm initial={cms.companyReality} />
      <HomepageWorkshopGallerySettingsForm initial={cms.workshopGallery} />
      <HomepageSectionsSettingsForm cms={cms} />
    </>
  );
}

import AdminPageTitle from "@/components/admin/AdminPageTitle";
import HomepageHeroSettingsForm from "@/components/admin/HomepageHeroSettingsForm";
import { getHomepageHeroConfig } from "@/features/home/homepage.service";

export default async function HomepageSettingsPage() {
  const hero = await getHomepageHeroConfig();

  return (
    <>
      <AdminPageTitle title="Nội dung trang chủ" />
      <HomepageHeroSettingsForm initial={hero} />
    </>
  );
}

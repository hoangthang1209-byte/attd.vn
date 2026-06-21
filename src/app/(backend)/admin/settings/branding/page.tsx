import AdminPageTitle from "@/components/admin/AdminPageTitle";
import BrandingSettingsForm from "@/components/admin/BrandingSettingsForm";
import { loadBrandingAdminInitial } from "@/features/settings/services/settings.service";

export default async function BrandingSettingsPage() {
  const { tableReady, initial } = await loadBrandingAdminInitial();

  return (
    <>
      <AdminPageTitle title={"Nhận diện thương hiệu"} />
      {!tableReady && (
        <p className="admin-message admin-message--error" role="alert">
          BrandingSettings table chưa tồn tại. Chạy prisma migrate deploy.
        </p>
      )}
      <BrandingSettingsForm initial={initial} readOnly={!tableReady} />
    </>
  );
}

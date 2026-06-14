import AdminShell from "@/components/admin/AdminShell";
import BrandingSettingsForm from "@/components/admin/BrandingSettingsForm";
import { prisma } from "@/lib/prisma";
import {
  seedBrandingSettings,
  getBrandingSettings,
} from "@/features/settings/services/settings.service";

export default async function BrandingSettingsPage() {
  let row = await prisma.brandingSettings.findUnique({ where: { id: "default" } });
  if (!row) {
    await seedBrandingSettings();
    row = await prisma.brandingSettings.findUnique({ where: { id: "default" } });
  }

  const fallback = await getBrandingSettings();

  const initial = {
    headerLogoUrl: row?.headerLogoUrl ?? null,
    footerLogoUrl: row?.footerLogoUrl ?? null,
    faviconUrl: row?.faviconUrl ?? null,
    defaultOgImageUrl: row?.defaultOgImageUrl ?? null,
    companyTagline: row?.companyTagline ?? fallback.companyTagline,
    facebookUrl: row?.facebookUrl ?? "",
    zaloUrl: row?.zaloUrl ?? "",
    youtubeUrl: row?.youtubeUrl ?? "",
    tiktokUrl: row?.tiktokUrl ?? "",
    linkedinUrl: row?.linkedinUrl ?? "",
  };

  return (
    <AdminShell title="Nhận diện thương hiệu">
      <BrandingSettingsForm initial={initial} />
    </AdminShell>
  );
}

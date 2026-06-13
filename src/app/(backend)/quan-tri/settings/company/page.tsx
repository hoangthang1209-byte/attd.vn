import AdminShell from "@/components/admin/AdminShell";
import CompanySettingsForm from "@/components/admin/CompanySettingsForm";
import { prisma } from "@/lib/prisma";
import { seedDefaultSettings } from "@/features/settings/services/settings.service";

export default async function CompanySettingsPage() {
  let row = await prisma.companySettings.findUnique({ where: { id: "default" } });
  if (!row) {
    await seedDefaultSettings();
    row = await prisma.companySettings.findUnique({ where: { id: "default" } });
  }

  const initial = {
    brandName: row?.brandName ?? "ATTD",
    legalName: row?.legalName ?? "",
    tagline: row?.tagline ?? "",
    hotlineRaw: row?.hotlineRaw ?? "",
    hotlineDisplay: row?.hotlineDisplay ?? "",
    zaloPhone: row?.zaloPhone ?? "",
    zaloUrl: row?.zaloUrl ?? "",
    email: row?.email ?? "",
    address: row?.address ?? "",
    taxCode: row?.taxCode ?? "",
    workingHours: row?.workingHours ?? "",
  };

  return (
    <AdminShell title="Thông tin công ty">
      <CompanySettingsForm initial={initial} />
    </AdminShell>
  );
}

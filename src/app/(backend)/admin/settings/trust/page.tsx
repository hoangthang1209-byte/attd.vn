import AdminShell from "@/components/admin/AdminShell";
import TrustSettingsForm from "@/components/admin/TrustSettingsForm";
import { prisma } from "@/lib/prisma";
import { seedDefaultSettings } from "@/features/settings/services/settings.service";

export default async function TrustSettingsPage() {
  let row = await prisma.trustMetricsSettings.findUnique({ where: { id: "default" } });
  if (!row) {
    await seedDefaultSettings();
    row = await prisma.trustMetricsSettings.findUnique({ where: { id: "default" } });
  }

  const initial = {
    clientsCount: row?.clientsCount ?? null,
    partnerCount: row?.partnerCount ?? null,
    provinceCount: row?.provinceCount ?? null,
    experienceYears: row?.experienceYears ?? null,
    sectionTitle: row?.sectionTitle ?? "Tại sao đại lý và doanh nghiệp chọn ATTD?",
  };

  return (
    <AdminShell title="Chỉ số tin cậy">
      <TrustSettingsForm initial={initial} />
    </AdminShell>
  );
}

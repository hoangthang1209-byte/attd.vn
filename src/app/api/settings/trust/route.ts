import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getTrustMetricsSettings,
  upsertTrustMetricsSettings,
} from "@/features/settings/services/settings.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

function parseNullableInt(value: unknown): number | null {
  if (value === null || value === "" || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export async function GET() {
  const settings = await getTrustMetricsSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const permission = await requireAdminPermission({
    platform: "operations",
    action: "update",
    request,
  });
  if (!permission.ok) return permission.response;

  try {
    const body = await request.json();

    await upsertTrustMetricsSettings({
      clientsCount: parseNullableInt(body.clientsCount),
      partnerCount: parseNullableInt(body.partnerCount),
      provinceCount: parseNullableInt(body.provinceCount),
      experienceYears: parseNullableInt(body.experienceYears),
      sectionTitle: String(
        body.sectionTitle ?? "Tại sao đại lý và doanh nghiệp chọn ATTD?"
      ).trim(),
    });

    revalidatePath("/", "layout");

    const settings = await getTrustMetricsSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[api/settings/trust] PATCH failed:", err);
    return NextResponse.json({ message: "Lưu thất bại" }, { status: 500 });
  }
}

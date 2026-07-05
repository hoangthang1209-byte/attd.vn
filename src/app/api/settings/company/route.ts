import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getCompanySettings,
  upsertCompanySettings,
} from "@/features/settings/services/settings.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET() {
  const settings = await getCompanySettings();
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

    await upsertCompanySettings({
      brandName: String(body.brandName ?? body.name ?? "ATTD").trim(),
      legalName: String(body.legalName ?? "").trim(),
      tagline: String(body.tagline ?? "").trim(),
      hotlineRaw: String(body.hotlineRaw ?? body.hotline?.raw ?? "").trim(),
      hotlineDisplay: String(body.hotlineDisplay ?? body.hotline?.display ?? "").trim(),
      zaloPhone: String(body.zaloPhone ?? body.zalo?.phone ?? "").trim(),
      zaloUrl: String(body.zaloUrl ?? body.zalo?.url ?? "").trim(),
      email: String(body.email ?? "").trim(),
      address: String(body.address ?? "").trim(),
      taxCode: String(body.taxCode ?? "").trim(),
      workingHours: String(body.workingHours ?? "").trim(),
    });

    revalidatePath("/", "layout");

    const settings = await getCompanySettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[api/settings/company] PATCH failed:", err);
    return NextResponse.json({ message: "Lưu thất bại" }, { status: 500 });
  }
}

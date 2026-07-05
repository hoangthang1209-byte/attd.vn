import { NextResponse } from "next/server";
import { updateDemoImages } from "@/features/demo/demo-image-service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "operations",
    action: "admin",
    request,
  });
  if (!permission.ok) return permission.response;

  try {
    const summary = await updateDemoImages();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error("[POST /api/admin/demo/images]", err);
    return NextResponse.json({ ok: false, message: String(err) }, { status: 500 });
  }
}

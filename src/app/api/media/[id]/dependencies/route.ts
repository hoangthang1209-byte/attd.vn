import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { resolveMediaDependencies } from "@/features/media/lifecycle/media-dependency.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  const summary = await resolveMediaDependencies(id);
  return NextResponse.json(summary);
}

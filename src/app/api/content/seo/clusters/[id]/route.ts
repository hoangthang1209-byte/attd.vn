import { NextRequest, NextResponse } from "next/server";
import {
  deleteSeoCluster,
  getSeoClusterById,
  updateSeoCluster,
} from "@/features/content/services/seo-cluster.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody, parseStringArray } from "@/features/content/seo/seo-api-utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const cluster = await getSeoClusterById(id);
  if (!cluster) return NextResponse.json({ message: "Không tìm thấy cụm chủ đề" }, { status: 404 });
  return NextResponse.json({ cluster });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const raw = await parseJsonBody(req);
  if (!raw) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });

  try {
    const cluster = await updateSeoCluster(id, {
      name: typeof raw.name === "string" ? raw.name : undefined,
      parentId: raw.parentId === null ? null : typeof raw.parentId === "string" ? raw.parentId : undefined,
      code: raw.code === null ? null : typeof raw.code === "string" ? raw.code : undefined,
      slug: raw.slug === null ? null : typeof raw.slug === "string" ? raw.slug : undefined,
      description:
        raw.description === null ? null : typeof raw.description === "string" ? raw.description : undefined,
      pillarTopic:
        raw.pillarTopic === null ? null : typeof raw.pillarTopic === "string" ? raw.pillarTopic : undefined,
      targetAudience: parseStringArray(raw.targetAudience),
      businessGoals: parseStringArray(raw.businessGoals),
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
    });
    return NextResponse.json({ cluster });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể cập nhật cụm chủ đề" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "delete", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  try {
    await deleteSeoCluster(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể xóa cụm chủ đề" },
      { status: 409 },
    );
  }
}

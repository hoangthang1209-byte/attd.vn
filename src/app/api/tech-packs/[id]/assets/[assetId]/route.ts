import { NextRequest, NextResponse } from "next/server";
import { TechPackAssetType } from "@prisma/client";
import {
  deleteTechPackAsset,
  TechPackValidationError,
  updateTechPackAsset,
} from "@/features/tech-pack/tech-pack.service";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; assetId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "tech-pack",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id, assetId } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;
  const type =
    typeof raw.type === "string" &&
    Object.values(TechPackAssetType).includes(raw.type as TechPackAssetType)
      ? (raw.type as TechPackAssetType)
      : undefined;

  try {
    const asset = await updateTechPackAsset(id, assetId, {
      type,
      title: raw.title === null ? null : typeof raw.title === "string" ? raw.title : undefined,
      description:
        raw.description === null ? null : typeof raw.description === "string" ? raw.description : undefined,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
    });
    return NextResponse.json(asset);
  } catch (err) {
    if (err instanceof TechPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/tech-packs/[id]/assets/[assetId]]", err);
    return NextResponse.json({ message: "Không thể cập nhật tài sản." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "tech-pack",
    action: "delete",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id, assetId } = await context.params;
  try {
    const result = await deleteTechPackAsset(id, assetId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TechPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[DELETE /api/tech-packs/[id]/assets/[assetId]]", err);
    return NextResponse.json({ message: "Không thể xóa tài sản." }, { status: 500 });
  }
}

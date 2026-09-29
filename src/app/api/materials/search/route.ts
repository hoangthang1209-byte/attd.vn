import { NextRequest, NextResponse } from "next/server";
import { listMaterials } from "@/features/materials/material.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "view",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { searchParams } = new URL(req.url);
  const result = await listMaterials({
    search: searchParams.get("search") ?? undefined,
    activeOnly: searchParams.get("activeOnly") !== "false",
    limit: 30,
    offset: 0,
  });

  return NextResponse.json({
    items: result.materials.map((material) => ({
      id: material.id,
      code: material.materialCode,
      name: material.name,
    })),
  });
}

import { NextRequest, NextResponse } from "next/server";
import {
  archiveSeoStrategy,
  deleteSeoStrategy,
  getSeoStrategyById,
  updateSeoStrategy,
} from "@/features/content/services/seo-strategy.service";
import { listSeoClusters } from "@/features/content/services/seo-cluster.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseEnum, parseJsonBody, SEO_STRATEGY_STATUSES } from "@/features/content/seo/seo-api-utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  try {
    const strategy = await getSeoStrategyById(id);
    if (!strategy) return NextResponse.json({ message: "Không tìm thấy chiến lược" }, { status: 404 });
    const clusters = await listSeoClusters({ strategyId: id });
    return NextResponse.json({ strategy, clusters });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tải chiến lược" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const raw = await parseJsonBody(req);
  if (!raw) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });

  try {
    const strategy = await updateSeoStrategy(id, {
      name: typeof raw.name === "string" ? raw.name : undefined,
      code: raw.code === null ? null : typeof raw.code === "string" ? raw.code : undefined,
      description:
        raw.description === null ? null : typeof raw.description === "string" ? raw.description : undefined,
      status: parseEnum(raw.status, SEO_STRATEGY_STATUSES) ?? undefined,
      ownerId: raw.ownerId === null ? null : typeof raw.ownerId === "string" ? raw.ownerId : undefined,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
    });
    return NextResponse.json({ strategy });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể cập nhật chiến lược" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "delete", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  try {
    if (searchParams.get("archive") === "1") {
      await archiveSeoStrategy(id);
      return NextResponse.json({ success: true });
    }
    await deleteSeoStrategy(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể xóa chiến lược";
    return NextResponse.json(
      { message },
      { status: message.includes("Không thể xóa") ? 409 : 400 },
    );
  }
}

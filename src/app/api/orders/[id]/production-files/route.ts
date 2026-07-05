import { NextRequest, NextResponse } from "next/server";
import type { MaterialType, ProductionFileStatus, ProductionFileType } from "@prisma/client";
import {
  archiveOrderProductionFile,
  createOrderProductionFile,
  deleteOrderProductionFile,
  listOrderProductionFiles,
  ProductionPackValidationError,
  updateOrderProductionFile,
} from "@/features/orders/production-pack.service";
import { PRODUCTION_FILE_TYPES } from "@/features/orders/production-pack-labels";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

function parseOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

function parseProductionFileType(value: unknown): ProductionFileType {
  if (typeof value !== "string" || !PRODUCTION_FILE_TYPES.includes(value as ProductionFileType)) {
    throw new ProductionPackValidationError("Loại file không hợp lệ.");
  }
  return value as ProductionFileType;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const files = await listOrderProductionFiles(id);
    return NextResponse.json({ files });
  } catch (err) {
    if (err instanceof ProductionPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[GET /api/orders/[id]/production-files]", err);
    return NextResponse.json({ message: "Không thể tải file sản xuất" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
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
  try {
    if (typeof raw.mediaAssetId !== "string" || !raw.mediaAssetId.trim()) {
      throw new ProductionPackValidationError("Vui lòng chọn file từ thư viện media.");
    }
    const file = await createOrderProductionFile(id, {
      orderId: parseOptionalString(raw.orderId) ?? null,
      orderItemId: parseOptionalString(raw.orderItemId) ?? null,
      mediaAssetId: raw.mediaAssetId.trim(),
      type: parseProductionFileType(raw.type),
      status: typeof raw.status === "string" ? (raw.status as ProductionFileStatus) : undefined,
      version: typeof raw.version === "number" ? raw.version : undefined,
      title: parseOptionalString(raw.title),
      note: parseOptionalString(raw.note),
      appliesToColorId: parseOptionalString(raw.appliesToColorId),
      appliesToColorName: parseOptionalString(raw.appliesToColorName),
      appliesToSize: parseOptionalString(raw.appliesToSize),
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
      setAsActive: raw.setAsActive !== false,
    });
    return NextResponse.json({ file }, { status: 201 });
  } catch (err) {
    if (err instanceof ProductionPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/[id]/production-files]", err);
    return NextResponse.json({ message: "Không thể thêm file sản xuất" }, { status: 500 });
  }
}

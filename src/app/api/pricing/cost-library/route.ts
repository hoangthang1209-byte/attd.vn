import { NextRequest, NextResponse } from "next/server";
import {
  createCostLibraryItem,
  CostLibraryValidationError,
  listCostLibraryItems,
} from "@/features/pricing/services/cost-library.service";
import { isCostLibraryCategory } from "@/features/pricing/cost-library";
import { can } from "@/features/auth/admin-permissions";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "view",
    request: req,
  });
  if (!permission.ok) return permission.response;

  try {
    const items = await listCostLibraryItems();
    const canManageLibrary = can(permission.session, "pricing.manage");
    return NextResponse.json({ items, canManageLibrary });
  } catch (err) {
    console.error("[GET /api/pricing/cost-library]", err);
    return NextResponse.json({ message: "Không thể tải thư viện chi phí" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  if (!can(permission.session, "pricing.manage")) {
    return NextResponse.json(
      { message: "Bạn không có quyền lưu chi phí vào thư viện." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name : "";
  const category = typeof raw.category === "string" ? raw.category : "";
  const defaultUnitCost =
    typeof raw.defaultUnitCost === "number"
      ? raw.defaultUnitCost
      : typeof raw.defaultUnitCost === "string"
        ? Number(raw.defaultUnitCost)
        : NaN;

  if (!isCostLibraryCategory(category)) {
    return NextResponse.json({ message: "Loại chi phí không hợp lệ." }, { status: 400 });
  }

  try {
    const item = await createCostLibraryItem({
      name,
      category,
      defaultUnitCost,
      defaultNote: typeof raw.defaultNote === "string" ? raw.defaultNote : null,
      defaultQuantityFactor:
        typeof raw.defaultQuantityFactor === "number" ? raw.defaultQuantityFactor : 1,
      createdByUserId: permission.session.userId,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof CostLibraryValidationError) {
      return NextResponse.json(
        {
          message: err.message,
          code: err.code,
          existingItem: err.existingItem ?? null,
        },
        { status: err.code.startsWith("DUPLICATE") ? 409 : 400 },
      );
    }
    console.error("[POST /api/pricing/cost-library]", err);
    return NextResponse.json({ message: "Không thể lưu chi phí vào thư viện" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import type { ProductAttributeType } from "@prisma/client";
import {
  listAttributeOptions,
  createAttributeOption,
} from "@/features/products/product-attribute.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

const VALID_TYPES: ProductAttributeType[] = ["COLOR", "SIZE", "MATERIAL", "FORM", "FIT", "DIMENSION", "CAPACITY", "UNIT"];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const typeParam = sp.get("type");
  const type = typeParam && VALID_TYPES.includes(typeParam as ProductAttributeType)
    ? typeParam as ProductAttributeType
    : undefined;
  const options = await listAttributeOptions({ type, status: "ACTIVE" });
  return NextResponse.json(options);
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "product",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  const raw = body as Record<string, unknown>;
  if (!raw.type || !raw.name) {
    return NextResponse.json({ message: "type và name là bắt buộc." }, { status: 400 });
  }
  if (!VALID_TYPES.includes(raw.type as ProductAttributeType)) {
    return NextResponse.json({ message: "type không hợp lệ." }, { status: 400 });
  }
  try {
    const option = await createAttributeOption({
      type: raw.type as ProductAttributeType,
      name: String(raw.name),
      code: raw.code ? String(raw.code) : undefined,
      value: raw.value ? String(raw.value) : undefined,
      sortOrder: raw.sortOrder ? Number(raw.sortOrder) : undefined,
    });
    return NextResponse.json(option, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi tạo thuộc tính";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  createCustomerType,
  listCustomerTypes,
} from "@/features/crm/services/customer-type.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("activeOnly") === "1";
  const includeCounts = searchParams.get("includeCounts") === "1";

  try {
    const types = await listCustomerTypes({ activeOnly, includeCounts });
    return NextResponse.json({ types });
  } catch (err) {
    console.error("[GET /api/crm/customer-types]", err);
    return NextResponse.json({ message: "Không thể tải loại khách hàng" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

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
  const name = typeof raw.name === "string" ? raw.name : "";
  const code = typeof raw.code === "string" ? raw.code : "";
  const description = typeof raw.description === "string" ? raw.description : null;
  const sortOrder =
    typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder) ? raw.sortOrder : undefined;
  const isActive = typeof raw.isActive === "boolean" ? raw.isActive : undefined;

  try {
    const type = await createCustomerType({ code, name, description, sortOrder, isActive });
    return NextResponse.json({ type }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tạo loại khách hàng" },
      { status: 400 },
    );
  }
}

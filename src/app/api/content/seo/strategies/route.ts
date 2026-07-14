import { NextRequest, NextResponse } from "next/server";
import {
  createSeoStrategy,
  listSeoStrategies,
} from "@/features/content/services/seo-strategy.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseEnum, parseJsonBody, SEO_STRATEGY_STATUSES } from "@/features/content/seo/seo-api-utils";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const { searchParams } = new URL(req.url);
  const status = parseEnum(searchParams.get("status"), SEO_STRATEGY_STATUSES);
  try {
    const strategies = await listSeoStrategies({
      search: searchParams.get("search") ?? undefined,
      status: status ?? undefined,
    });
    return NextResponse.json({ strategies });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tải chiến lược" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "create", request: req });
  if (!permission.ok) return permission.response;

  const raw = await parseJsonBody(req);
  if (!raw) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });

  const name = typeof raw.name === "string" ? raw.name : "";
  if (!name.trim()) return NextResponse.json({ message: "Tên chiến lược là bắt buộc" }, { status: 400 });

  try {
    const strategy = await createSeoStrategy({
      name,
      code: typeof raw.code === "string" ? raw.code : null,
      description: typeof raw.description === "string" ? raw.description : null,
      status: parseEnum(raw.status, SEO_STRATEGY_STATUSES) ?? undefined,
      ownerId: typeof raw.ownerId === "string" ? raw.ownerId : null,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
    });
    return NextResponse.json({ strategy }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tạo chiến lược" },
      { status: 400 },
    );
  }
}

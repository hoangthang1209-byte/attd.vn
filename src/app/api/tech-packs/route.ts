import { NextRequest, NextResponse } from "next/server";
import { TechPackStatus } from "@prisma/client";
import {
  createTechPack,
  listTechPacks,
  TechPackValidationError,
} from "@/features/tech-pack/tech-pack.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";

export async function GET(req: NextRequest) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam && Object.values(TechPackStatus).includes(statusParam as TechPackStatus)
      ? (statusParam as TechPackStatus)
      : undefined;

  try {
    const result = await listTechPacks({
      status,
      customerId: searchParams.get("customerId") ?? undefined,
      productId: searchParams.get("productId") ?? undefined,
      orderItemId: searchParams.get("orderItemId") ?? undefined,
      quoteItemId: searchParams.get("quoteItemId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/tech-packs]", err);
    return NextResponse.json({ message: "Không thể tải danh sách Tech Pack." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

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
    const pack = await createTechPack({
      orderItemId: typeof raw.orderItemId === "string" ? raw.orderItemId : null,
      quoteItemId: typeof raw.quoteItemId === "string" ? raw.quoteItemId : null,
      title: typeof raw.title === "string" ? raw.title : null,
    });
    return NextResponse.json(pack, { status: 201 });
  } catch (err) {
    if (err instanceof TechPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/tech-packs]", err);
    return NextResponse.json({ message: "Không thể tạo Tech Pack." }, { status: 500 });
  }
}

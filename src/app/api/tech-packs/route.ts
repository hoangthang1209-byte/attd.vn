import { NextRequest, NextResponse } from "next/server";
import { TechPackStatus } from "@prisma/client";
import {
  createTechPack,
  listTechPacks,
  TechPackValidationError,
} from "@/features/tech-pack/tech-pack.service";
import {
  techPackStatusForQuickFilter,
  type TechPackListQuickFilter,
} from "@/features/tech-pack/tech-pack-completeness";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";

const QUICK_FILTERS = new Set<TechPackListQuickFilter>([
  "all",
  "draft",
  "released",
  "missing_pattern",
  "missing_artwork",
  "mine",
]);

export async function GET(req: NextRequest) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const quickFilterParam = searchParams.get("quickFilter") as TechPackListQuickFilter | null;
  const quickFilter =
    quickFilterParam && QUICK_FILTERS.has(quickFilterParam) ? quickFilterParam : "all";

  const statusFromQuick = techPackStatusForQuickFilter(quickFilter);
  const status =
    statusParam && Object.values(TechPackStatus).includes(statusParam as TechPackStatus)
      ? (statusParam as TechPackStatus)
      : statusFromQuick;

  const mine = quickFilter === "mine";

  try {
    const result = await listTechPacks({
      status,
      customerId: searchParams.get("customerId") ?? undefined,
      productId: searchParams.get("productId") ?? undefined,
      orderItemId: searchParams.get("orderItemId") ?? undefined,
      quoteItemId: searchParams.get("quoteItemId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      quickFilter,
      ownerEmployeeId: mine ? auth.session.employeeId ?? undefined : undefined,
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

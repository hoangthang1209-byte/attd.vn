import { NextRequest, NextResponse } from "next/server";
import {
  createSalesRepresentative,
  listSalesRepresentatives,
  SalesValidationError,
} from "@/features/sales/services/sales-representative.service";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? undefined;
  const activeOnly = searchParams.get("active") === "1" || searchParams.get("activeOnly") === "true";

  const { salesReps, total } = await listSalesRepresentatives({
    search,
    activeOnly,
  });

  return NextResponse.json({ salesReps, total });
}

export async function POST(req: NextRequest) {
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
    const salesRep = await createSalesRepresentative({
      fullName: typeof raw.fullName === "string" ? raw.fullName : "",
      title: typeof raw.title === "string" ? raw.title : null,
      phone: typeof raw.phone === "string" ? raw.phone : null,
      email: typeof raw.email === "string" ? raw.email : null,
      zalo: typeof raw.zalo === "string" ? raw.zalo : null,
      address: typeof raw.address === "string" ? raw.address : null,
      avatarMediaAssetId:
        typeof raw.avatarMediaAssetId === "string" ? raw.avatarMediaAssetId : null,
      avatarUrl: typeof raw.avatarUrl === "string" ? raw.avatarUrl : null,
      isActive: raw.isActive !== false,
      isDefault: raw.isDefault === true,
      note: typeof raw.note === "string" ? raw.note : null,
    });
    return NextResponse.json({ salesRep }, { status: 201 });
  } catch (err) {
    if (err instanceof SalesValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[sales] create failed", err);
    return NextResponse.json({ message: "Không thể tạo nhân viên tư vấn" }, { status: 500 });
  }
}

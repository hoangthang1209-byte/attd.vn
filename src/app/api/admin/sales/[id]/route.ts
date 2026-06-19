import { NextRequest, NextResponse } from "next/server";
import {
  getSalesRepresentative,
  updateSalesRepresentative,
} from "@/features/sales/services/sales-representative.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const salesRep = await getSalesRepresentative(id);
  if (!salesRep) {
    return NextResponse.json({ message: "Không tìm thấy nhân viên tư vấn" }, { status: 404 });
  }
  return NextResponse.json({ salesRep });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
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
  const salesRep = await updateSalesRepresentative(id, {
    fullName: typeof raw.fullName === "string" ? raw.fullName : undefined,
    title: typeof raw.title === "string" ? raw.title : raw.title === null ? null : undefined,
    phone: typeof raw.phone === "string" ? raw.phone : raw.phone === null ? null : undefined,
    email: typeof raw.email === "string" ? raw.email : raw.email === null ? null : undefined,
    zalo: typeof raw.zalo === "string" ? raw.zalo : raw.zalo === null ? null : undefined,
    address:
      typeof raw.address === "string" ? raw.address : raw.address === null ? null : undefined,
    avatarMediaAssetId:
      typeof raw.avatarMediaAssetId === "string"
        ? raw.avatarMediaAssetId
        : raw.avatarMediaAssetId === null
          ? null
          : undefined,
    avatarUrl:
      typeof raw.avatarUrl === "string" ? raw.avatarUrl : raw.avatarUrl === null ? null : undefined,
    isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
    isDefault: typeof raw.isDefault === "boolean" ? raw.isDefault : undefined,
    note: typeof raw.note === "string" ? raw.note : raw.note === null ? null : undefined,
  });

  if (!salesRep) {
    return NextResponse.json({ message: "Không tìm thấy nhân viên tư vấn" }, { status: 404 });
  }

  return NextResponse.json({ salesRep });
}

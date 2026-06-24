import { NextRequest, NextResponse } from "next/server";
import { listAdministrativeWards } from "@/features/administrative/administrative.service";

export async function GET(req: NextRequest) {
  try {
    const provinceId = req.nextUrl.searchParams.get("provinceId")?.trim();
    if (!provinceId) {
      return NextResponse.json({ message: "Thiếu provinceId." }, { status: 400 });
    }
    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    const wards = await listAdministrativeWards(provinceId, search);
    return NextResponse.json({ wards });
  } catch (err) {
    console.error("[GET /api/admin/administrative/wards]", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tải phường/xã." },
      { status: 500 },
    );
  }
}

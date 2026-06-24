import { NextRequest, NextResponse } from "next/server";
import {
  listAdministrativeProvinces,
  listAdministrativeWards,
} from "@/features/administrative/administrative.service";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    const provinces = await listAdministrativeProvinces(search);
    return NextResponse.json({ provinces });
  } catch (err) {
    console.error("[GET /api/admin/administrative/provinces]", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tải tỉnh/thành phố." },
      { status: 500 },
    );
  }
}

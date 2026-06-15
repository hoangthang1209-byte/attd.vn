import { NextResponse } from "next/server";
import { getDemoStatus } from "@/features/demo/demo-content-service";

export async function GET() {
  try {
    const status = await getDemoStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (err) {
    console.error("[GET /api/admin/demo/status]", err);
    return NextResponse.json({ ok: false, message: String(err) }, { status: 500 });
  }
}

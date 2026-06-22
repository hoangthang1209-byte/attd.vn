import { NextResponse } from "next/server";
import { isR2Configured } from "@/features/storage/r2/r2-client";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ configured: isR2Configured() });
}

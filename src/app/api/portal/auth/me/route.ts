import { NextResponse } from "next/server";
import { getDealerPortalContext } from "@/lib/dealer-auth/get-dealer-portal-context";

export async function GET() {
  const context = await getDealerPortalContext();
  return NextResponse.json({ context });
}

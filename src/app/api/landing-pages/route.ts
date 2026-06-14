import { NextResponse } from "next/server";
import {
  ensureLandingPagesSeeded,
  isLandingPageTableReady,
  listLandingPages,
} from "@/features/landing-pages/services/landing-page.service";

export async function GET() {
  const tableReady = await isLandingPageTableReady();
  if (tableReady) {
    await ensureLandingPagesSeeded();
  }
  const pages = tableReady ? await listLandingPages() : [];
  return NextResponse.json({ tableReady, pages });
}

import { NextResponse } from "next/server";
import { updateDemoImages } from "@/features/demo/demo-image-service";

export async function POST() {
  try {
    const summary = await updateDemoImages();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error("[POST /api/admin/demo/images]", err);
    return NextResponse.json({ ok: false, message: String(err) }, { status: 500 });
  }
}

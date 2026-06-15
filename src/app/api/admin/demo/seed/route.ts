import { NextRequest, NextResponse } from "next/server";
import { seedDemoContent, deleteDemoContent } from "@/features/demo/demo-content-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { groups?: string[] };
    const groups = Array.isArray(body.groups) && body.groups.length > 0
      ? body.groups
      : ["all"];
    const summary = await seedDemoContent(groups);
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error("[POST /api/admin/demo/seed]", err);
    return NextResponse.json({ ok: false, message: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    const result = await deleteDemoContent();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[DELETE /api/admin/demo/seed]", err);
    return NextResponse.json({ ok: false, message: String(err) }, { status: 500 });
  }
}

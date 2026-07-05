import { NextRequest, NextResponse } from "next/server";
import {
  getTechPackDetail,
  TechPackValidationError,
  updateTechPack,
} from "@/features/tech-pack/tech-pack.service";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  try {
    const pack = await getTechPackDetail(id);
    if (!pack) {
      return NextResponse.json({ message: "Không tìm thấy Tech Pack." }, { status: 404 });
    }
    return NextResponse.json(pack);
  } catch (err) {
    console.error("[GET /api/tech-packs/[id]]", err);
    return NextResponse.json({ message: "Không thể tải Tech Pack." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "tech-pack",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
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
    const pack = await updateTechPack(id, {
      title: raw.title === null ? null : typeof raw.title === "string" ? raw.title : undefined,
      bomNotes: raw.bomNotes === null ? null : typeof raw.bomNotes === "string" ? raw.bomNotes : undefined,
      trimsNotes: raw.trimsNotes === null ? null : typeof raw.trimsNotes === "string" ? raw.trimsNotes : undefined,
      printMethodNotes:
        raw.printMethodNotes === null
          ? null
          : typeof raw.printMethodNotes === "string"
            ? raw.printMethodNotes
            : undefined,
      embroideryNotes:
        raw.embroideryNotes === null
          ? null
          : typeof raw.embroideryNotes === "string"
            ? raw.embroideryNotes
            : undefined,
      deadline: raw.deadline === null ? null : typeof raw.deadline === "string" ? raw.deadline : undefined,
      qcNotes: raw.qcNotes === null ? null : typeof raw.qcNotes === "string" ? raw.qcNotes : undefined,
      productionNotes:
        raw.productionNotes === null
          ? null
          : typeof raw.productionNotes === "string"
            ? raw.productionNotes
            : undefined,
      internalNotes:
        raw.internalNotes === null
          ? null
          : typeof raw.internalNotes === "string"
            ? raw.internalNotes
            : undefined,
      patternExceptionReason:
        raw.patternExceptionReason === null
          ? null
          : typeof raw.patternExceptionReason === "string"
            ? raw.patternExceptionReason
            : undefined,
      measurements: Array.isArray(raw.measurements) ? (raw.measurements as never) : undefined,
    });
    return NextResponse.json(pack);
  } catch (err) {
    if (err instanceof TechPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/tech-packs/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật Tech Pack." }, { status: 500 });
  }
}

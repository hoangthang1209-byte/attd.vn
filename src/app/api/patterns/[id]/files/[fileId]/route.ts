import { NextRequest, NextResponse } from "next/server";
import { PatternFileType } from "@prisma/client";
import {
  deletePatternFile,
  PatternValidationError,
  updatePatternFile,
} from "@/features/patterns/pattern.service";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id, fileId } = await context.params;
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
  const type =
    typeof raw.type === "string" && Object.values(PatternFileType).includes(raw.type as PatternFileType)
      ? (raw.type as PatternFileType)
      : undefined;

  try {
    const file = await updatePatternFile(id, fileId, {
      type,
      title: raw.title === null ? null : typeof raw.title === "string" ? raw.title : undefined,
      description:
        raw.description === null ? null : typeof raw.description === "string" ? raw.description : undefined,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
    });
    return NextResponse.json(file);
  } catch (err) {
    if (err instanceof PatternValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/patterns/[id]/files/[fileId]]", err);
    return NextResponse.json({ message: "Không thể cập nhật file." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id, fileId } = await context.params;
  try {
    const result = await deletePatternFile(id, fileId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PatternValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[DELETE /api/patterns/[id]/files/[fileId]]", err);
    return NextResponse.json({ message: "Không thể xóa file." }, { status: 500 });
  }
}

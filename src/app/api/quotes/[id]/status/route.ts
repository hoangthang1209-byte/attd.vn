import type { QuoteStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { QuoteValidationError, updateQuoteStatus } from "@/features/quotes/quote.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

const VALID: QuoteStatus[] = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"];

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const status = (body as { status?: string }).status as QuoteStatus | undefined;
  if (!status || !VALID.includes(status)) {
    return NextResponse.json({ message: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  try {
    const quote = await updateQuoteStatus(id, status);
    return NextResponse.json({ quote });
  } catch (err) {
    if (err instanceof QuoteValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/quotes/[id]/status]", err);
    return NextResponse.json({ message: "Không thể cập nhật trạng thái" }, { status: 500 });
  }
}

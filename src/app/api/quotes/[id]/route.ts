import type { QuoteStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { parseCreateQuoteBody } from "@/features/quotes/quote-input";
import {
  getQuoteDetail,
  updateQuote,
  QuoteValidationError,
} from "@/features/quotes/quote.service";
import { ensureQuotePublicShortCode } from "@/features/quotes/quote-public-link.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const quote = await getQuoteDetail(id);
    if (!quote) return NextResponse.json({ message: "Không tìm thấy báo giá" }, { status: 404 });
    const publicShortCode = await ensureQuotePublicShortCode(id);
    return NextResponse.json({ quote: { ...quote, publicShortCode } });
  } catch (err) {
    console.error("[GET /api/quotes/[id]]", err);
    return NextResponse.json({ message: "Không thể tải báo giá" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
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
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  try {
    const quote = await updateQuote(id, parseCreateQuoteBody(body as Record<string, unknown>));
    return NextResponse.json({ quote });
  } catch (err) {
    if (err instanceof QuoteValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/quotes/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật báo giá" }, { status: 500 });
  }
}

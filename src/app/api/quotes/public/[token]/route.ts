import { NextResponse } from "next/server";
import { getPublicQuoteByToken } from "@/features/quotes/quote.service";
import {
  assertPublicTokenSafePayload,
  createPublicTokenForbiddenFieldResponse,
} from "@/lib/permissions/public-token-safety";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { token } = await context.params;
  try {
    const quote = await getPublicQuoteByToken(token, true);
    if (!quote) {
      return NextResponse.json({ message: "Không tìm thấy báo giá" }, { status: 404 });
    }
    const safety = assertPublicTokenSafePayload(quote);
    if (!safety.ok) {
      console.error("[GET /api/quotes/public/[token]] unsafe public quote payload", {
        token,
        forbiddenFields: safety.forbiddenFields,
      });
      return createPublicTokenForbiddenFieldResponse(safety.forbiddenFields);
    }
    return NextResponse.json({ quote });
  } catch (err) {
    console.error("[GET /api/quotes/public/[token]]", err);
    return NextResponse.json({ message: "Không thể tải báo giá" }, { status: 500 });
  }
}

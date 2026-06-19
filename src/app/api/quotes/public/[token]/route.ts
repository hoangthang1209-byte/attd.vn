import { NextResponse } from "next/server";
import { getPublicQuoteByToken } from "@/features/quotes/quote.service";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { token } = await context.params;
  try {
    const quote = await getPublicQuoteByToken(token, true);
    if (!quote) {
      return NextResponse.json({ message: "Không tìm thấy báo giá" }, { status: 404 });
    }
    return NextResponse.json({ quote });
  } catch (err) {
    console.error("[GET /api/quotes/public/[token]]", err);
    return NextResponse.json({ message: "Không thể tải báo giá" }, { status: 500 });
  }
}

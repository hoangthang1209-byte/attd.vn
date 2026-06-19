import { NextResponse } from "next/server";
import { duplicateQuote, QuoteValidationError } from "@/features/quotes/quote.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const quote = await duplicateQuote(id);
    return NextResponse.json({ quote }, { status: 201 });
  } catch (err) {
    if (err instanceof QuoteValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/quotes/[id]/duplicate]", err);
    return NextResponse.json({ message: "Không thể sao chép báo giá" }, { status: 500 });
  }
}

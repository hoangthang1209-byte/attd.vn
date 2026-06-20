import { NextRequest, NextResponse } from "next/server";
import {
  convertQuoteToOrder,
  OrderConversionError,
} from "@/features/orders/order-conversion.service";

type RouteContext = { params: Promise<{ quoteId: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  const { quoteId } = await context.params;
  try {
    const order = await convertQuoteToOrder(quoteId);
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderConversionError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/from-quote/[quoteId]]", err);
    return NextResponse.json({ message: "Không thể tạo đơn hàng từ báo giá" }, { status: 500 });
  }
}

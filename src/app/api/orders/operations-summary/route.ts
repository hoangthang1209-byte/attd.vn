import { NextResponse } from "next/server";
import { getOrderOperationalSummary } from "@/features/orders/order-operations.service";

export async function GET() {
  try {
    const summary = await getOrderOperationalSummary();
    return NextResponse.json({ summary });
  } catch (err) {
    console.error("[GET /api/orders/operations-summary]", err);
    return NextResponse.json({ message: "Không thể tải tổng quan vận hành" }, { status: 500 });
  }
}

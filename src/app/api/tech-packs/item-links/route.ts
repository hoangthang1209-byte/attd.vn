import { NextRequest, NextResponse } from "next/server";
import {
  getTechPackLinksForOrderItems,
  getTechPackLinksForQuoteItems,
} from "@/features/tech-pack/tech-pack.service";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

export async function GET(req: NextRequest) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const orderItemIds = (searchParams.get("orderItemIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const quoteItemIds = (searchParams.get("quoteItemIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const [orderLinks, quoteLinks] = await Promise.all([
      getTechPackLinksForOrderItems(orderItemIds),
      getTechPackLinksForQuoteItems(quoteItemIds),
    ]);
    return NextResponse.json({ orderItems: orderLinks, quoteItems: quoteLinks });
  } catch (err) {
    console.error("[GET /api/tech-packs/item-links]", err);
    return NextResponse.json({ message: "Không thể tải liên kết Tech Pack." }, { status: 500 });
  }
}

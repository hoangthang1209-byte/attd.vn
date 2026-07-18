import { NextResponse } from "next/server";
import { getPublicProductsBySlugs } from "@/features/products/services/product.service";
import {
  mapProductToDiscoveryCard,
  normalizeRecentProductSlugs,
} from "@/features/products/product-discovery";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slugs = normalizeRecentProductSlugs(searchParams.get("slugs")?.split(",") ?? [], 12);

    if (!slugs.length) {
      return NextResponse.json({ products: [] });
    }

    const products = await getPublicProductsBySlugs(slugs, 12);
    return NextResponse.json({ products: products.map(mapProductToDiscoveryCard) });
  } catch {
    return NextResponse.json({ products: [] }, { status: 200 });
  }
}

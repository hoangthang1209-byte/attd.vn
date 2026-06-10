import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const variants = await prisma.productVariant.findMany({
    include: {
      product: true,
      color: true,
      size: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(variants);
}

export async function POST(request: Request) {
  const body = await request.json();

  const variant = await prisma.productVariant.create({
    data: {
      productId: body.productId,
      colorId: body.colorId,
      sizeId: body.sizeId,
      sku: body.sku,
      dealerPrice: body.dealerPrice,
      vipPrice: body.vipPrice,
    },
  });

  return NextResponse.json(variant);
}
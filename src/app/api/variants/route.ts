import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

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
  const permission = await requireAdminPermission({
    platform: "product",
    action: "create",
    request,
  });
  if (!permission.ok) return permission.response;

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

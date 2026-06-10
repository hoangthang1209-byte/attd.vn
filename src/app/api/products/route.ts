import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
    },
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const body = await request.json();

  const product = await prisma.product.create({
    data: {
      name: body.name,
      slug: body.slug,
      categoryId: body.categoryId,
    },
  });

  return NextResponse.json(product);
}
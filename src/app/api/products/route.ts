import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      variants: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.productCode?.trim()) {
    return NextResponse.json(
      {
        message: "Mã sản phẩm là bắt buộc",
      },
      {
        status: 400,
      }
    );
  }

  const slug = body.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("đ", "d")
    .replaceAll(" ", "-");

  const product = await prisma.product.create({
    data: {
      name: body.name,
      productCode: body.productCode,
      slug,
      categoryId: body.categoryId,
    },
    include: {
      category: true,
    },
  });

  return NextResponse.json(product);
}
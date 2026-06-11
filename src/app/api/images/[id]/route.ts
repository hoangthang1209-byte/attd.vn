import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const image = await prisma.productImage.findUnique({ where: { id } });
  if (!image) {
    return NextResponse.json(
      { message: "Không tìm thấy ảnh" },
      { status: 404 }
    );
  }

  // Delete from Vercel Blob — non-fatal if the URL is not a Blob URL
  await del(image.imageUrl).catch(() => {});

  await prisma.productImage.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (body.action === "setPrimary") {
    const image = await prisma.productImage.findUnique({ where: { id } });
    if (!image) {
      return NextResponse.json(
        { message: "Không tìm thấy ảnh" },
        { status: 404 }
      );
    }

    const allImages = await prisma.productImage.findMany({
      where: { productId: image.productId },
      orderBy: { sortOrder: "asc" },
    });

    // Move target to front; keep relative order of others
    const reordered = [image, ...allImages.filter((img) => img.id !== id)];

    await prisma.$transaction(
      reordered.map((img, index) =>
        prisma.productImage.update({
          where: { id: img.id },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  }

  if (typeof body.altText !== "undefined") {
    const updated = await prisma.productImage.update({
      where: { id },
      data: { altText: body.altText?.trim() || null },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json(
    { message: "Hành động không hợp lệ" },
    { status: 400 }
  );
}

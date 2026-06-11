import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 4 * 1024 * 1024; // 4 MB

export async function POST(request: Request) {
  const formData = await request.formData();

  const fileEntry = formData.get("file");
  const productId = formData.get("productId");
  const altText = formData.get("altText");

  if (!productId || typeof productId !== "string") {
    return NextResponse.json(
      { message: "productId là bắt buộc" },
      { status: 400 }
    );
  }

  if (!fileEntry || typeof fileEntry === "string") {
    return NextResponse.json(
      { message: "File ảnh là bắt buộc" },
      { status: 400 }
    );
  }

  const file = fileEntry;

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { message: "Chỉ hỗ trợ jpg, jpeg, png, webp" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { message: "File không được vượt quá 4MB" },
      { status: 400 }
    );
  }

  let blob: Awaited<ReturnType<typeof put>>;
  try {
    blob = await put(`products/${productId}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
  } catch {
    return NextResponse.json(
      { message: "Không thể tải ảnh lên. Vui lòng thử lại." },
      { status: 500 }
    );
  }

  try {
    const count = await prisma.productImage.count({ where: { productId } });
    const image = await prisma.productImage.create({
      data: {
        productId,
        imageUrl: blob.url,
        altText:
          altText && typeof altText === "string" ? altText.trim() || null : null,
        sortOrder: count,
      },
    });
    return NextResponse.json(image, { status: 201 });
  } catch {
    // Orphan cleanup: remove the uploaded blob if DB write fails
    await del(blob.url).catch(() => {});
    return NextResponse.json(
      { message: "Không thể lưu thông tin ảnh" },
      { status: 500 }
    );
  }
}

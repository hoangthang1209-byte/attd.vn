import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Keep in sync with client-side ALLOWED_TYPES in ProductImageManager
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 4 * 1024 * 1024; // 4 MB

export async function POST(request: Request) {
  const isDev = process.env.NODE_ENV === "development";

  // ── 1. Token guard ─────────────────────────────────────────────────────────
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[api/images] ✗ BLOB_READ_WRITE_TOKEN is not configured");
    return NextResponse.json(
      { message: "BLOB_READ_WRITE_TOKEN is not configured" },
      { status: 500 }
    );
  }
  console.log("[api/images] ✓ TOKEN EXISTS");

  // ── 2. FormData parsing ────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    console.error("[api/images] ✗ FormData parse failed:", err);
    return NextResponse.json(
      {
        message: isDev
          ? `FormData parse failed: ${err instanceof Error ? err.message : String(err)}`
          : "Không thể đọc dữ liệu form",
      },
      { status: 400 }
    );
  }

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

  // ── 3. Log file metadata ───────────────────────────────────────────────────
  console.log(
    `[api/images] file.name="${file.name}" file.size=${file.size} file.type="${file.type}" productId="${productId}"`
  );

  // ── 4. Validation ──────────────────────────────────────────────────────────
  if (!ALLOWED_TYPES.includes(file.type)) {
    console.log(`[api/images] ✗ Rejected MIME type: "${file.type}"`);
    return NextResponse.json(
      {
        message: `Định dạng không hỗ trợ: "${file.type}". Chỉ hỗ trợ jpg, jpeg, png, webp.`,
      },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      {
        message: `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)} MB). Tối đa 4 MB.`,
      },
      { status: 400 }
    );
  }

  // ── 5. Convert File → Buffer ───────────────────────────────────────────────
  // Passing a Web API File directly to @vercel/blob inside Next.js App Router
  // (Node.js runtime) can silently fail. Buffer is the safe, supported path.
  let fileBuffer: Buffer;
  try {
    fileBuffer = Buffer.from(await file.arrayBuffer());
    console.log(`[api/images] ✓ Buffer ready, byteLength=${fileBuffer.byteLength}`);
  } catch (err) {
    console.error("[api/images] ✗ file.arrayBuffer() failed:", err);
    return NextResponse.json(
      {
        message: isDev
          ? `Failed to read file: ${err instanceof Error ? err.message : String(err)}`
          : "Không thể đọc file",
      },
      { status: 400 }
    );
  }

  // ── 6. Vercel Blob upload ──────────────────────────────────────────────────
  const blobPathname = `products/${productId}/${file.name}`;
  console.log(`[api/images] Calling put("${blobPathname}", buffer, { contentType: "${file.type}" })`);

  let blob: Awaited<ReturnType<typeof put>>;
  try {
    blob = await put(blobPathname, fileBuffer, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    });
    console.log(`[api/images] ✓ Blob uploaded: ${blob.url}`);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[api/images] ✗ put() failed:", detail, err);
    return NextResponse.json(
      {
        message: isDev
          ? `Blob upload failed: ${detail}`
          : "Không thể tải ảnh lên. Vui lòng thử lại.",
      },
      { status: 500 }
    );
  }

  // ── 7. Prisma insert ───────────────────────────────────────────────────────
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
    console.log(`[api/images] ✓ ProductImage created: id=${image.id}`);
    return NextResponse.json(image, { status: 201 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[api/images] ✗ Prisma create failed:", detail, err);
    // Orphan cleanup: remove the uploaded blob since DB write failed
    await del(blob.url).catch((delErr) =>
      console.error("[api/images] Orphan blob cleanup failed:", delErr)
    );
    return NextResponse.json(
      {
        message: isDev
          ? `Database write failed: ${detail}`
          : "Không thể lưu thông tin ảnh",
      },
      { status: 500 }
    );
  }
}

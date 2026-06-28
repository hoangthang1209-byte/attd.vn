import { NextRequest, NextResponse } from "next/server";
import { PatternFileType } from "@prisma/client";
import {
  addPatternFile,
  PatternValidationError,
} from "@/features/patterns/pattern.service";
import {
  inferPatternFileType,
  UPLOAD_ERROR_MESSAGES,
  validateProductionFilename,
} from "@/features/tech-pack/tech-pack-file-validation";
import {
  prepareR2Upload,
  uploadPreviewToCloudinary,
  isCloudinaryConfigured,
} from "@/features/tech-pack/tech-pack-storage";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";

type RouteContext = { params: Promise<{ id: string }> };

function parsePatternFileType(value: unknown): PatternFileType | null {
  if (typeof value !== "string") return null;
  return Object.values(PatternFileType).includes(value as PatternFileType)
    ? (value as PatternFileType)
    : null;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const contentType = req.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const type = parsePatternFileType(form.get("type")) ?? PatternFileType.OTHER;
      const title = typeof form.get("title") === "string" ? form.get("title") as string : null;

      if (!(file instanceof File)) {
        return NextResponse.json({ message: UPLOAD_ERROR_MESSAGES.missingFile }, { status: 400 });
      }

      const validationError = validateProductionFilename(file.name);
      if (validationError) {
        return NextResponse.json({ message: validationError }, { status: 400 });
      }

      const fileType = inferPatternFileType(file.name, file.type);
      const buffer = Buffer.from(await file.arrayBuffer());
      let r2ObjectKey: string | null = null;
      let cloudinaryPublicId: string | null = null;
      let previewUrl: string | null = null;

      const r2Prep = await prepareR2Upload({
        scope: "pattern",
        scopeId: id,
        filename: file.name,
        mimeType: file.type,
        forPattern: true,
      });

      if (r2Prep.meta?.privateOriginal && r2Prep.objectKey) {
        if (!r2Prep.uploadUrl) {
          return NextResponse.json(
            { message: r2Prep.error ?? UPLOAD_ERROR_MESSAGES.r2Missing },
            { status: 503 },
          );
        }
        const putRes = await fetch(r2Prep.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: buffer,
        });
        if (!putRes.ok) {
          return NextResponse.json({ message: UPLOAD_ERROR_MESSAGES.uploadFailed }, { status: 502 });
        }
        r2ObjectKey = r2Prep.objectKey;
      } else if (isCloudinaryConfigured()) {
        const uploaded = await uploadPreviewToCloudinary(buffer, file.name, file.type, "patterns");
        cloudinaryPublicId = uploaded.publicId;
        previewUrl = uploaded.previewUrl;
      } else {
        return NextResponse.json({ message: UPLOAD_ERROR_MESSAGES.cloudinaryMissing }, { status: 503 });
      }

      const created = await addPatternFile(id, {
        type: type === PatternFileType.OTHER ? fileType : type,
        title,
        r2ObjectKey,
        cloudinaryPublicId,
        previewUrl,
        originalFileName: file.name,
        mimeType: file.type || null,
      });
      return NextResponse.json(created, { status: 201 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "Request body missing" }, { status: 400 });
    }
    const raw = body as Record<string, unknown>;
    const type = parsePatternFileType(raw.type);
    if (!type) return NextResponse.json({ message: "Loại file không hợp lệ." }, { status: 400 });

    const created = await addPatternFile(id, {
      type,
      title: typeof raw.title === "string" ? raw.title : null,
      description: typeof raw.description === "string" ? raw.description : null,
      r2ObjectKey: typeof raw.r2ObjectKey === "string" ? raw.r2ObjectKey : null,
      cloudinaryPublicId: typeof raw.cloudinaryPublicId === "string" ? raw.cloudinaryPublicId : null,
      previewUrl: typeof raw.previewUrl === "string" ? raw.previewUrl : null,
      originalFileName: typeof raw.originalFileName === "string" ? raw.originalFileName : null,
      mimeType: typeof raw.mimeType === "string" ? raw.mimeType : null,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : 0,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof PatternValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/patterns/[id]/files]", err);
    return NextResponse.json({ message: UPLOAD_ERROR_MESSAGES.uploadFailed }, { status: 500 });
  }
}

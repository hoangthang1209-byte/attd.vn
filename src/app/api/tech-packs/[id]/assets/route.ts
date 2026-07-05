import { NextRequest, NextResponse } from "next/server";
import { TechPackAssetType, TechPackAssetFileType } from "@prisma/client";
import {
  addTechPackAsset,
  TechPackValidationError,
} from "@/features/tech-pack/tech-pack.service";
import {
  inferTechPackAssetFileType,
  UPLOAD_ERROR_MESSAGES,
  validateProductionFilename,
} from "@/features/tech-pack/tech-pack-file-validation";
import {
  prepareR2Upload,
  uploadPreviewToCloudinary,
  isCloudinaryConfigured,
} from "@/features/tech-pack/tech-pack-storage";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

function parseAssetType(value: unknown): TechPackAssetType | null {
  if (typeof value !== "string") return null;
  return Object.values(TechPackAssetType).includes(value as TechPackAssetType)
    ? (value as TechPackAssetType)
    : null;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "tech-pack",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const contentType = req.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const type = parseAssetType(form.get("type"));
      const title = typeof form.get("title") === "string" ? (form.get("title") as string) : null;

      if (!(file instanceof File)) {
        return NextResponse.json({ message: UPLOAD_ERROR_MESSAGES.missingFile }, { status: 400 });
      }
      if (!type) {
        return NextResponse.json({ message: "Loại tài sản không hợp lệ." }, { status: 400 });
      }

      const validationError = validateProductionFilename(file.name);
      if (validationError) {
        return NextResponse.json({ message: validationError }, { status: 400 });
      }

      const fileType = inferTechPackAssetFileType(file.name, file.type);
      const buffer = Buffer.from(await file.arrayBuffer());
      let r2ObjectKey: string | null = null;
      let cloudinaryPublicId: string | null = null;
      let previewUrl: string | null = null;

      const r2Prep = await prepareR2Upload({
        scope: "tech-pack",
        scopeId: id,
        filename: file.name,
        mimeType: file.type,
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
        const uploaded = await uploadPreviewToCloudinary(buffer, file.name, file.type, "tech-packs");
        cloudinaryPublicId = uploaded.publicId;
        previewUrl = uploaded.previewUrl;
      } else {
        return NextResponse.json({ message: UPLOAD_ERROR_MESSAGES.cloudinaryMissing }, { status: 503 });
      }

      const created = await addTechPackAsset(id, {
        type,
        title,
        r2ObjectKey,
        cloudinaryPublicId,
        previewUrl,
        originalFileName: file.name,
        mimeType: file.type || null,
        fileType,
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
    const type = parseAssetType(raw.type);
    if (!type) return NextResponse.json({ message: "Loại tài sản không hợp lệ." }, { status: 400 });

    const fileType =
      typeof raw.fileType === "string" &&
      Object.values(TechPackAssetFileType).includes(raw.fileType as TechPackAssetFileType)
        ? (raw.fileType as TechPackAssetFileType)
        : TechPackAssetFileType.OTHER;

    const created = await addTechPackAsset(id, {
      type,
      title: typeof raw.title === "string" ? raw.title : null,
      description: typeof raw.description === "string" ? raw.description : null,
      cloudinaryPublicId: typeof raw.cloudinaryPublicId === "string" ? raw.cloudinaryPublicId : null,
      previewUrl: typeof raw.previewUrl === "string" ? raw.previewUrl : null,
      r2ObjectKey: typeof raw.r2ObjectKey === "string" ? raw.r2ObjectKey : null,
      originalFileName: typeof raw.originalFileName === "string" ? raw.originalFileName : null,
      mimeType: typeof raw.mimeType === "string" ? raw.mimeType : null,
      fileType,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : 0,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof TechPackValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/tech-packs/[id]/assets]", err);
    return NextResponse.json({ message: UPLOAD_ERROR_MESSAGES.uploadFailed }, { status: 500 });
  }
}

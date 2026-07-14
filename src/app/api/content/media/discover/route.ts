import { NextResponse } from "next/server";
import {
  discoverMediaAssets,
  MEDIA_DISCOVERY_MAX_LIMIT,
} from "@/features/media/services/media-discovery.service";
import {
  validateMediaOrientation,
  validateMediaVisibility,
} from "@/features/media/media-classification";
import { validateMediaCollectionType } from "@/features/media/media-collection.types";
import {
  validateMediaAssetType,
  validateMediaSeoReadinessStatus,
} from "@/features/media/services/media-intelligence.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import type { MediaCollectionType, MediaAssetType, MediaSeoReadinessStatus } from "@prisma/client";

function parseStringArray(value: unknown, field: string): string[] | { error: string } {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return { error: `${field} phải là mảng chuỗi` };
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

export async function POST(request: Request) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body không hợp lệ" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  const libraries = parseStringArray(raw.libraries, "libraries");
  if ("error" in libraries) return NextResponse.json({ message: libraries.error }, { status: 400 });

  const roles = parseStringArray(raw.roles, "roles");
  if ("error" in roles) return NextResponse.json({ message: roles.error }, { status: 400 });

  const collections = parseStringArray(raw.collections, "collections");
  if ("error" in collections) {
    return NextResponse.json({ message: collections.error }, { status: 400 });
  }

  const keywords = parseStringArray(raw.keywords, "keywords");
  if ("error" in keywords) return NextResponse.json({ message: keywords.error }, { status: 400 });

  const tags = parseStringArray(raw.tags, "tags");
  if ("error" in tags) return NextResponse.json({ message: tags.error }, { status: 400 });

  const excludeIds = parseStringArray(raw.excludeIds, "excludeIds");
  if ("error" in excludeIds) {
    return NextResponse.json({ message: excludeIds.error }, { status: 400 });
  }

  const subjects = parseStringArray(raw.subjects, "subjects");
  if ("error" in subjects) return NextResponse.json({ message: subjects.error }, { status: 400 });
  const materials = parseStringArray(raw.materials, "materials");
  if ("error" in materials) return NextResponse.json({ message: materials.error }, { status: 400 });
  const colors = parseStringArray(raw.colors, "colors");
  if ("error" in colors) return NextResponse.json({ message: colors.error }, { status: 400 });
  const techniques = parseStringArray(raw.techniques, "techniques");
  if ("error" in techniques) {
    return NextResponse.json({ message: techniques.error }, { status: 400 });
  }
  const industries = parseStringArray(raw.industries, "industries");
  if ("error" in industries) {
    return NextResponse.json({ message: industries.error }, { status: 400 });
  }
  const audiences = parseStringArray(raw.audiences, "audiences");
  if ("error" in audiences) return NextResponse.json({ message: audiences.error }, { status: 400 });
  const useCases = parseStringArray(raw.useCases, "useCases");
  if ("error" in useCases) return NextResponse.json({ message: useCases.error }, { status: 400 });

  const collectionTypesRaw = parseStringArray(raw.collectionTypes, "collectionTypes");
  if ("error" in collectionTypesRaw) {
    return NextResponse.json({ message: collectionTypesRaw.error }, { status: 400 });
  }
  const collectionTypes: MediaCollectionType[] = [];
  for (const value of collectionTypesRaw) {
    const parsed = validateMediaCollectionType(value);
    if (!parsed) {
      return NextResponse.json({ message: "Loại bộ sưu tập không hợp lệ" }, { status: 400 });
    }
    collectionTypes.push(parsed);
  }

  const assetTypesRaw = parseStringArray(raw.assetTypes, "assetTypes");
  if ("error" in assetTypesRaw) {
    return NextResponse.json({ message: assetTypesRaw.error }, { status: 400 });
  }
  const assetTypes: MediaAssetType[] = [];
  for (const value of assetTypesRaw) {
    const parsed = validateMediaAssetType(value);
    if (!parsed) {
      return NextResponse.json({ message: "Loại tài sản không hợp lệ" }, { status: 400 });
    }
    assetTypes.push(parsed);
  }

  const readinessRaw = parseStringArray(raw.seoReadinessStatuses, "seoReadinessStatuses");
  if ("error" in readinessRaw) {
    return NextResponse.json({ message: readinessRaw.error }, { status: 400 });
  }
  const seoReadinessStatuses: MediaSeoReadinessStatus[] = [];
  for (const value of readinessRaw) {
    const parsed = validateMediaSeoReadinessStatus(value);
    if (!parsed) {
      return NextResponse.json({ message: "Trạng thái SEO không hợp lệ" }, { status: 400 });
    }
    seoReadinessStatuses.push(parsed);
  }

  let orientation = undefined;
  if ("orientation" in raw) {
    const parsed = validateMediaOrientation(raw.orientation);
    if (!parsed) {
      return NextResponse.json({ message: "Hướng ảnh không hợp lệ" }, { status: 400 });
    }
    orientation = parsed;
  }

  let visibility = undefined;
  if ("visibility" in raw) {
    const parsed = validateMediaVisibility(raw.visibility);
    if (!parsed) {
      return NextResponse.json({ message: "Mức độ hiển thị không hợp lệ" }, { status: 400 });
    }
    visibility = parsed;
  }

  let minimumSeoScore: number | undefined;
  if ("minimumSeoScore" in raw) {
    const n =
      typeof raw.minimumSeoScore === "number"
        ? raw.minimumSeoScore
        : Number(raw.minimumSeoScore);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json({ message: "Điểm SEO tối thiểu không hợp lệ" }, { status: 400 });
    }
    minimumSeoScore = Math.floor(n);
  }

  let limit = 12;
  if ("limit" in raw) {
    const n = typeof raw.limit === "number" ? raw.limit : Number(raw.limit);
    if (!Number.isFinite(n) || n < 1 || n > MEDIA_DISCOVERY_MAX_LIMIT) {
      return NextResponse.json(
        { message: `Giới hạn kết quả phải từ 1 đến ${MEDIA_DISCOVERY_MAX_LIMIT}` },
        { status: 400 },
      );
    }
    limit = Math.floor(n);
  }

  try {
    const results = await discoverMediaAssets({
      query: typeof raw.query === "string" ? raw.query : undefined,
      libraries,
      roles,
      collections,
      collectionTypes,
      keywords,
      tags,
      orientation,
      visibility,
      language: typeof raw.language === "string" ? raw.language : undefined,
      limit,
      excludeIds,
      assetTypes,
      subjects,
      materials,
      colors,
      techniques,
      industries,
      audiences,
      useCases,
      minimumSeoScore,
      seoReadinessStatuses,
    });

    return NextResponse.json({
      items: results.map(({ asset, score, matchedOn }) => ({
        id: asset.id,
        url: asset.url,
        thumbnailUrl: asset.thumbnailUrl,
        title: asset.title,
        altText: asset.altText,
        library: asset.library
          ? { code: asset.library.code, name: asset.library.name }
          : null,
        role: asset.role ? { code: asset.role.code, name: asset.role.name } : null,
        collections: (asset.collections ?? []).slice(0, 5).map((join) => ({
          code: join.mediaCollection.code,
          name: join.mediaCollection.name,
          collectionType: join.mediaCollection.collectionType,
        })),
        subjectTerms: asset.subjectTerms,
        assetType: asset.assetType,
        seoScore: asset.seoScore,
        seoReadinessStatus: asset.seoReadinessStatus,
        orientation: asset.orientation,
        visibility: asset.visibility,
        createdAt: asset.createdAt,
        score,
        matchedOn,
      })),
    });
  } catch (err) {
    console.error("[POST /api/content/media/discover]", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tìm kiếm ảnh" },
      { status: 500 },
    );
  }
}

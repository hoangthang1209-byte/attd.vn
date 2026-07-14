import { NextResponse } from "next/server";
import { assessMediaCoverage } from "@/features/media/services/media-coverage.service";
import { validateMediaOrientation } from "@/features/media/media-classification";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

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

  const subjects = parseStringArray(raw.subjects, "subjects");
  if ("error" in subjects) return NextResponse.json({ message: subjects.error }, { status: 400 });

  const industries = parseStringArray(raw.industries, "industries");
  if ("error" in industries) return NextResponse.json({ message: industries.error }, { status: 400 });

  const useCases = parseStringArray(raw.useCases, "useCases");
  if ("error" in useCases) return NextResponse.json({ message: useCases.error }, { status: 400 });

  let orientation = undefined;
  if ("orientation" in raw) {
    const parsed = validateMediaOrientation(raw.orientation);
    if (!parsed) {
      return NextResponse.json({ message: "Hướng ảnh không hợp lệ" }, { status: 400 });
    }
    orientation = parsed;
  }

  let minimumSeoScore: number | undefined;
  if ("minimumSeoScore" in raw) {
    const n = typeof raw.minimumSeoScore === "number" ? raw.minimumSeoScore : Number(raw.minimumSeoScore);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json({ message: "Điểm SEO tối thiểu không hợp lệ" }, { status: 400 });
    }
    minimumSeoScore = n;
  }

  let recommendedMinimum: number | undefined;
  if ("recommendedMinimum" in raw) {
    const n =
      typeof raw.recommendedMinimum === "number"
        ? raw.recommendedMinimum
        : Number(raw.recommendedMinimum);
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json({ message: "Ngưỡng khuyến nghị không hợp lệ" }, { status: 400 });
    }
    recommendedMinimum = n;
  }

  try {
    const result = await assessMediaCoverage({
      query: typeof raw.query === "string" ? raw.query : undefined,
      libraries,
      roles,
      subjects,
      industries,
      useCases,
      orientation,
      minimumSeoScore,
      recommendedMinimum,
    });

    return NextResponse.json({
      totalSuitable: result.totalSuitable,
      excellent: result.excellent,
      ready: result.ready,
      basic: result.basic,
      insufficient: result.insufficient,
      recommendedMinimum: result.recommendedMinimum,
      gaps: result.gaps,
      coverageLevel: result.coverageLevel,
      sampleAssets: result.sampleAssets.map(({ asset, score, matchedOn }) => ({
        id: asset.id,
        url: asset.url,
        thumbnailUrl: asset.thumbnailUrl,
        title: asset.title,
        altText: asset.altText,
        seoScore: asset.seoScore,
        seoReadinessStatus: asset.seoReadinessStatus,
        library: asset.library ? { code: asset.library.code, name: asset.library.name } : null,
        role: asset.role ? { code: asset.role.code, name: asset.role.name } : null,
        score,
        matchedOn,
      })),
    });
  } catch (err) {
    console.error("[POST /api/content/media/coverage]", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể đánh giá độ phủ ảnh" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { planMediaContentCoverage } from "@/features/media/services/media-coverage.service";
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
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  if (typeof raw.contentType !== "string" || !raw.contentType.trim()) {
    return NextResponse.json({ message: "Loại nội dung là bắt buộc" }, { status: 400 });
  }

  const subjectTerms = parseStringArray(raw.subjectTerms, "subjectTerms");
  if ("error" in subjectTerms) return NextResponse.json({ message: subjectTerms.error }, { status: 400 });
  const industryTerms = parseStringArray(raw.industryTerms, "industryTerms");
  if ("error" in industryTerms) return NextResponse.json({ message: industryTerms.error }, { status: 400 });
  const useCaseTerms = parseStringArray(raw.useCaseTerms, "useCaseTerms");
  if ("error" in useCaseTerms) return NextResponse.json({ message: useCaseTerms.error }, { status: 400 });
  const techniqueTerms = parseStringArray(raw.techniqueTerms, "techniqueTerms");
  if ("error" in techniqueTerms) return NextResponse.json({ message: techniqueTerms.error }, { status: 400 });

  let minimumSeoScore: number | undefined;
  if ("minimumSeoScore" in raw) {
    const n = typeof raw.minimumSeoScore === "number" ? raw.minimumSeoScore : Number(raw.minimumSeoScore);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json({ message: "Điểm SEO tối thiểu không hợp lệ" }, { status: 400 });
    }
    minimumSeoScore = Math.floor(n);
  }

  try {
    const plan = await planMediaContentCoverage({
      contentType: raw.contentType,
      query: typeof raw.query === "string" ? raw.query : undefined,
      subjectTerms,
      industryTerms,
      useCaseTerms,
      techniqueTerms,
      minimumSeoScore,
    });
    return NextResponse.json({ plan });
  } catch (err) {
    console.error("[POST /api/content/media/plan]", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể lập kế hoạch độ phủ ảnh" },
      { status: 500 },
    );
  }
}

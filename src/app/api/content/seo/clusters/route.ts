import { NextRequest, NextResponse } from "next/server";
import { createSeoCluster, listSeoClusters } from "@/features/content/services/seo-cluster.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody, parseStringArray } from "@/features/content/seo/seo-api-utils";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const { searchParams } = new URL(req.url);
  const strategyId = searchParams.get("strategyId") ?? undefined;
  const parentId = searchParams.has("parentId") ? searchParams.get("parentId") : undefined;

  try {
    const clusters = await listSeoClusters({
      strategyId,
      parentId: parentId === "null" ? null : parentId,
      activeOnly: searchParams.get("activeOnly") === "1",
    });
    return NextResponse.json({ clusters });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tải cụm chủ đề" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "create", request: req });
  if (!permission.ok) return permission.response;

  const raw = await parseJsonBody(req);
  if (!raw) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });

  const strategyId = typeof raw.strategyId === "string" ? raw.strategyId : "";
  const name = typeof raw.name === "string" ? raw.name : "";
  if (!strategyId || !name.trim()) {
    return NextResponse.json({ message: "Thiếu strategyId hoặc tên cụm" }, { status: 400 });
  }

  try {
    const cluster = await createSeoCluster({
      strategyId,
      name,
      parentId: raw.parentId === null ? null : typeof raw.parentId === "string" ? raw.parentId : undefined,
      code: typeof raw.code === "string" ? raw.code : null,
      slug: typeof raw.slug === "string" ? raw.slug : null,
      description: typeof raw.description === "string" ? raw.description : null,
      pillarTopic: typeof raw.pillarTopic === "string" ? raw.pillarTopic : null,
      targetAudience: parseStringArray(raw.targetAudience),
      businessGoals: parseStringArray(raw.businessGoals),
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
    });
    return NextResponse.json({ cluster }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tạo cụm chủ đề" },
      { status: 400 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  createKnowledgeBaseEntry,
  getKnowledgeBaseKpisFromDb,
  listKnowledgeBaseEntries,
} from "@/features/knowledge-base/knowledge-base-seed";
import { validateKnowledgeBaseEntry } from "@/features/knowledge-base/knowledge-base-validation";
import {
  calculateKnowledgeCompleteness,
  getCompletenessLabel,
} from "@/features/knowledge-base/knowledge-base-utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    const result = await listKnowledgeBaseEntries({
      search: searchParams.get("search") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      usageScope: searchParams.get("usageScope") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      verifiedOnly: searchParams.get("verifiedOnly") === "1",
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 50),
    });

    const entries = result.entries.map((entry) => {
      const completenessScore = calculateKnowledgeCompleteness(entry);
      return {
        ...entry,
        completenessScore,
        completenessLabel: getCompletenessLabel(completenessScore),
      };
    });

    const kpis = await getKnowledgeBaseKpisFromDb();

    return NextResponse.json({ ...result, entries, kpis });
  } catch (err) {
    console.error("[GET /api/admin/knowledge-base]", err);
    return NextResponse.json({ message: "Không thể tải Knowledge Base", entries: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const validation = validateKnowledgeBaseEntry(body as Record<string, unknown>);
  if (!validation.valid || !validation.data) {
    return NextResponse.json({ message: validation.errors.join(" ") }, { status: 400 });
  }

  try {
    const entry = await createKnowledgeBaseEntry({
      ...validation.data,
      structuredData: (validation.data.structuredData ?? undefined) as Prisma.InputJsonValue | undefined,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ message: "Slug đã tồn tại" }, { status: 409 });
    }
    console.error("[POST /api/admin/knowledge-base]", err);
    return NextResponse.json({ message: "Không thể tạo entry" }, { status: 500 });
  }
}

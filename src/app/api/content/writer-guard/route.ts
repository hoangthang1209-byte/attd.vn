import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import {
  getContextPackageForWriter,
  ContentWriterGuardError,
} from "@/features/content-context/services/content-writer-guard.service";

/**
 * Writer-guard smoke endpoint — validates package, does not generate content.
 */
export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const raw = (await parseJsonBody(req)) ?? {};
  const contextBuildId = typeof raw.contextBuildId === "string" ? raw.contextBuildId : "";
  const approvedBriefVersion =
    typeof raw.approvedBriefVersion === "number" ? raw.approvedBriefVersion : 0;
  const outputFormat =
    raw.outputFormat === "HTML" || raw.outputFormat === "STRUCTURED"
      ? raw.outputFormat
      : "MARKDOWN";

  if (!contextBuildId) {
    return NextResponse.json({ message: "contextBuildId bắt buộc" }, { status: 400 });
  }

  try {
    const pkg = await getContextPackageForWriter({
      contextBuildId,
      approvedBriefVersion,
      outputFormat,
    });
    return NextResponse.json({
      ok: true,
      message: "Package hợp lệ cho writer — không tạo bài viết trong sprint này.",
      packageId: pkg.id,
      purpose: pkg.contentPurpose,
      factCount: pkg.facts.length,
      readinessScore: pkg.diagnostics.readinessScore,
    });
  } catch (err) {
    if (err instanceof ContentWriterGuardError) {
      return NextResponse.json(
        { ok: false, message: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[POST writer-guard]", err);
    return NextResponse.json({ message: "Writer guard lỗi" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  suggestInternalLinksForTopic,
  updateInternalLinkOpportunity,
} from "@/features/content/services/seo-internal-link.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseEnum, parseJsonBody } from "@/features/content/seo/seo-api-utils";
import type { SeoInternalLinkStatus } from "@prisma/client";

const LINK_STATUSES = ["SUGGESTED", "ACCEPTED", "REJECTED", "IMPLEMENTED"] as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  try {
    const suggestions = await suggestInternalLinksForTopic(id);
    return NextResponse.json({ suggestions });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể gợi ý internal link" },
      { status: 400 },
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({ platform: "content", action: "update", request: req });
  if (!permission.ok) return permission.response;

  const raw = await parseJsonBody(req);
  if (!raw || typeof raw.linkId !== "string") {
    return NextResponse.json({ message: "Thiếu linkId" }, { status: 400 });
  }

  try {
    const link = await updateInternalLinkOpportunity(raw.linkId, {
      status: parseEnum(raw.status, LINK_STATUSES) as SeoInternalLinkStatus | undefined,
      anchorText: raw.anchorText === null ? null : typeof raw.anchorText === "string" ? raw.anchorText : undefined,
      context: raw.context === null ? null : typeof raw.context === "string" ? raw.context : undefined,
    });
    return NextResponse.json({ link });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể cập nhật internal link" },
      { status: 400 },
    );
  }
}

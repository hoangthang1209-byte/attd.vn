import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { Prisma } from "@prisma/client";
import type { LeadPipelineStatus } from "@prisma/client";

const VALID_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUOTED",
  "NEGOTIATING",
  "WON",
  "LOST",
] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

function isValidStatus(v: unknown): v is ValidStatus {
  return VALID_STATUSES.includes(v as ValidStatus);
}

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const permission = await requireAdminPermission({
    platform: "dealer",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, message: "Request body missing." },
      { status: 400 }
    );
  }

  const { status } = body as Record<string, unknown>;

  if (!isValidStatus(status)) {
    return NextResponse.json(
      {
        success: false,
        message: `status không hợp lệ. Các giá trị hợp lệ: ${VALID_STATUSES.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  // Fetch existing timestamps to enforce first-write-wins rule
  let existing: {
    contactedAt: Date | null;
    wonAt: Date | null;
    lostAt: Date | null;
  } | null = null;
  try {
    existing = await prisma.dealerLead.findUnique({
      where: { id },
      select: { contactedAt: true, wonAt: true, lostAt: true },
    });
  } catch {
    // Non-fatal; proceed without timestamps
  }

  const now = new Date();
  const timestampUpdate: Partial<{
    contactedAt: Date;
    wonAt: Date;
    lostAt: Date;
  }> = {};

  if (existing) {
    if (status === "CONTACTED" && !existing.contactedAt) {
      timestampUpdate.contactedAt = now;
    }
    if (status === "WON" && !existing.wonAt) {
      timestampUpdate.wonAt = now;
    }
    if (status === "LOST" && !existing.lostAt) {
      timestampUpdate.lostAt = now;
    }
  }

  try {
    const updated = await prisma.dealerLead.update({
      where: { id },
      data: {
        pipelineStatus: status as LeadPipelineStatus,
        ...timestampUpdate,
      },
    });
    return NextResponse.json({
      success: true,
      lead: {
        ...updated,
        estimatedValue: updated.estimatedValue?.toString() ?? null,
        contactedAt: updated.contactedAt?.toISOString() ?? null,
        wonAt: updated.wonAt?.toISOString() ?? null,
        lostAt: updated.lostAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy bản ghi." },
        { status: 404 }
      );
    }
    console.error("[PATCH /api/dealer-leads/[id]/status] DB error:", err);
    return NextResponse.json(
      { success: false, message: "Đã có lỗi xảy ra." },
      { status: 500 }
    );
  }
}

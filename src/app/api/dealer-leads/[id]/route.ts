import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { DealerLeadStatus, LeadPipelineStatus } from "@prisma/client";

const VALID_OLD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CLOSED",
] as const;
type ValidOldStatus = (typeof VALID_OLD_STATUSES)[number];

const VALID_PIPELINE_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUOTED",
  "NEGOTIATING",
  "WON",
  "LOST",
] as const;
type ValidPipelineStatus = (typeof VALID_PIPELINE_STATUSES)[number];

function isValidOldStatus(v: unknown): v is ValidOldStatus {
  return VALID_OLD_STATUSES.includes(v as ValidOldStatus);
}
function isValidPipelineStatus(v: unknown): v is ValidPipelineStatus {
  return VALID_PIPELINE_STATUSES.includes(v as ValidPipelineStatus);
}

type RouteParams = { params: Promise<{ id: string }> };

/** Builds timestamp updates that must never regress. */
function pipelineTimestamps(
  newStatus: ValidPipelineStatus,
  existing: {
    contactedAt: Date | null;
    wonAt: Date | null;
    lostAt: Date | null;
  }
): Partial<{
  contactedAt: Date;
  wonAt: Date;
  lostAt: Date;
}> {
  const now = new Date();
  const updates: Partial<{ contactedAt: Date; wonAt: Date; lostAt: Date }> = {};
  if (newStatus === "CONTACTED" && !existing.contactedAt) {
    updates.contactedAt = now;
  }
  if (newStatus === "WON" && !existing.wonAt) {
    updates.wonAt = now;
  }
  if (newStatus === "LOST" && !existing.lostAt) {
    updates.lostAt = now;
  }
  return updates;
}

export async function GET(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const lead = await prisma.dealerLead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy bản ghi." },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      lead: {
        ...lead,
        estimatedValue: lead.estimatedValue?.toString() ?? null,
        contactedAt: lead.contactedAt?.toISOString() ?? null,
        wonAt: lead.wonAt?.toISOString() ?? null,
        lostAt: lead.lostAt?.toISOString() ?? null,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[GET /api/dealer-leads/[id]] DB error:", err);
    return NextResponse.json(
      { success: false, message: "Đã có lỗi xảy ra." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
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

  const raw = body as Record<string, unknown>;

  function sanitize(v: unknown, maxLen = 255): string | null {
    if (typeof v !== "string") return null;
    const t = v.trim().slice(0, maxLen);
    return t || null;
  }

  const updateData: Prisma.DealerLeadUpdateInput = {};

  // Legacy status (DealerLeadStatus) — kept for backward compat
  if ("status" in raw) {
    if (!isValidOldStatus(raw.status)) {
      return NextResponse.json(
        {
          success: false,
          message: `status không hợp lệ. Các giá trị: ${VALID_OLD_STATUSES.join(", ")}.`,
        },
        { status: 400 }
      );
    }
    updateData.status = raw.status as DealerLeadStatus;
  }

  // CRM pipeline status (LeadPipelineStatus)
  if ("pipelineStatus" in raw) {
    if (!isValidPipelineStatus(raw.pipelineStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `pipelineStatus không hợp lệ. Các giá trị: ${VALID_PIPELINE_STATUSES.join(", ")}.`,
        },
        { status: 400 }
      );
    }
    updateData.pipelineStatus = raw.pipelineStatus as LeadPipelineStatus;

    // Business logic: auto-set timestamps
    try {
      const existing = await prisma.dealerLead.findUnique({
        where: { id },
        select: { contactedAt: true, wonAt: true, lostAt: true },
      });
      if (existing) {
        const ts = pipelineTimestamps(
          raw.pipelineStatus as ValidPipelineStatus,
          existing
        );
        Object.assign(updateData, ts);
      }
    } catch {
      // Non-fatal: continue without timestamps
    }
  }

  // CRM scalar fields
  if ("assignedTo" in raw) {
    updateData.assignedTo = sanitize(raw.assignedTo);
  }
  if ("salesNote" in raw) {
    updateData.salesNote = sanitize(raw.salesNote, 4000);
  }
  if ("estimatedValue" in raw) {
    if (raw.estimatedValue === null || raw.estimatedValue === undefined) {
      updateData.estimatedValue = null;
    } else {
      const num = Number(raw.estimatedValue);
      if (!Number.isFinite(num) || num < 0) {
        return NextResponse.json(
          { success: false, message: "estimatedValue phải là số dương." },
          { status: 400 }
        );
      }
      updateData.estimatedValue = new Prisma.Decimal(num);
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { success: false, message: "Không có trường nào để cập nhật." },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.dealerLead.update({
      where: { id },
      data: updateData,
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
    console.error("[PATCH /api/dealer-leads/[id]] DB error:", err);
    return NextResponse.json(
      { success: false, message: "Đã có lỗi xảy ra." },
      { status: 500 }
    );
  }
}

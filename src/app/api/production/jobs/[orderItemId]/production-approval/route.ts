import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { OrderItemProductionApprovalStatus } from "@prisma/client";
import { can } from "@/features/auth/admin-permissions";
import {
  getOrCreateProductionApproval,
  getProductionApprovalFormOptions,
  ProductionApprovalValidationError,
  upsertProductionApproval,
} from "@/features/item-production-tracking/production-approval.service";
import {
  requireProductionUpdate,
  requireProductionView,
} from "@/lib/admin-auth/require-production-api";

type Ctx = { params: Promise<{ orderItemId: string }> };

const STATUSES: OrderItemProductionApprovalStatus[] = [
  "PENDING",
  "NEEDS_REVISION",
  "RELEASED",
];

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;

  const { orderItemId } = await ctx.params;
  try {
    const [approval, options] = await Promise.all([
      getOrCreateProductionApproval(orderItemId),
      getProductionApprovalFormOptions(orderItemId),
    ]);
    return NextResponse.json({ approval, options });
  } catch (err) {
    if (err instanceof ProductionApprovalValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[GET production-approval]", err);
    return NextResponse.json({ message: "Không tải được duyệt sản xuất" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;
  if (
    !can(auth.session, "manufacturing.production.update") &&
    !can(auth.session, "production.update")
  ) {
    return NextResponse.json({ message: "Không có quyền cập nhật duyệt sản xuất" }, { status: 403 });
  }

  const { orderItemId } = await ctx.params;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const status = body.status as OrderItemProductionApprovalStatus;
    if (!STATUSES.includes(status)) {
      return NextResponse.json({ message: "Trạng thái duyệt không hợp lệ" }, { status: 400 });
    }
    if (typeof body.sampleRequired !== "boolean") {
      return NextResponse.json({ message: "Thiếu sampleRequired" }, { status: 400 });
    }

    const approval = await upsertProductionApproval({
      orderItemId,
      status,
      sampleRequired: body.sampleRequired,
      artworkFileId:
        body.artworkFileId === null
          ? null
          : typeof body.artworkFileId === "string"
            ? body.artworkFileId
            : undefined,
      sampleFileId:
        body.sampleFileId === null
          ? null
          : typeof body.sampleFileId === "string"
            ? body.sampleFileId
            : undefined,
      evidenceMediaAssetId:
        body.evidenceMediaAssetId === null
          ? null
          : typeof body.evidenceMediaAssetId === "string"
            ? body.evidenceMediaAssetId
            : undefined,
      techPackId:
        body.techPackId === null
          ? null
          : typeof body.techPackId === "string"
            ? body.techPackId
            : undefined,
      approvedByContactId:
        body.approvedByContactId === null
          ? null
          : typeof body.approvedByContactId === "string"
            ? body.approvedByContactId
            : undefined,
      approvedByName:
        body.approvedByName === null
          ? null
          : typeof body.approvedByName === "string"
            ? body.approvedByName
            : undefined,
      approvedAt:
        typeof body.approvedAt === "string" || body.approvedAt instanceof Date
          ? body.approvedAt
          : null,
      note:
        body.note === null
          ? null
          : typeof body.note === "string"
            ? body.note
            : undefined,
      adminUserId: auth.session.userId,
    });

    return NextResponse.json({ approval, message: "Đã lưu duyệt sản xuất" });
  } catch (err) {
    if (err instanceof ProductionApprovalValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PUT production-approval]", err);
    return NextResponse.json({ message: "Không lưu được duyệt sản xuất" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { MaterialValidationError } from "@/features/materials/material-decimal";
import {
  createPurchaseRequest,
  listPurchaseRequests,
} from "@/features/materials/purchase-request.service";
import type { PurchaseRequestStatus } from "@prisma/client";

const STATUSES: PurchaseRequestStatus[] = [
  "DRAFT",
  "REQUESTED",
  "ORDERED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  try {
    const requests = await listPurchaseRequests({
      search: searchParams.get("search") ?? undefined,
      status:
        statusParam && STATUSES.includes(statusParam as PurchaseRequestStatus)
          ? (statusParam as PurchaseRequestStatus)
          : undefined,
    });
    return NextResponse.json({ requests });
  } catch (err) {
    console.error("[GET /api/purchase-requests]", err);
    return NextResponse.json({ message: "Không thể tải yêu cầu mua hàng." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;
  const items = Array.isArray(raw.items) ? raw.items : [];

  try {
    const request = await createPurchaseRequest({
      supplierName: typeof raw.supplierName === "string" ? raw.supplierName : null,
      requestedByEmployeeId:
        typeof raw.requestedByEmployeeId === "string" ? raw.requestedByEmployeeId : null,
      expectedArrivalAt: typeof raw.expectedArrivalAt === "string" ? raw.expectedArrivalAt : null,
      note: typeof raw.note === "string" ? raw.note : null,
      status: raw.status === "REQUESTED" ? "REQUESTED" : "DRAFT",
      items: items.map((item, index) => {
        const row = item as Record<string, unknown>;
        return {
          materialId: typeof row.materialId === "string" ? row.materialId : null,
          materialCodeSnapshot:
            typeof row.materialCodeSnapshot === "string" ? row.materialCodeSnapshot : null,
          materialNameSnapshot:
            typeof row.materialNameSnapshot === "string" ? row.materialNameSnapshot : "",
          unitSnapshot: typeof row.unitSnapshot === "string" ? row.unitSnapshot : "",
          requestedQuantity: row.requestedQuantity != null ? String(row.requestedQuantity) : "0",
          orderedQuantity: row.orderedQuantity != null ? String(row.orderedQuantity) : null,
          linkedOrderId: typeof row.linkedOrderId === "string" ? row.linkedOrderId : null,
          note: typeof row.note === "string" ? row.note : null,
          sortOrder: index,
        };
      }),
    });
    return NextResponse.json({ request }, { status: 201 });
  } catch (err) {
    if (err instanceof MaterialValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/purchase-requests]", err);
    return NextResponse.json({ message: "Không thể tạo yêu cầu mua hàng." }, { status: 500 });
  }
}

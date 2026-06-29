import { NextRequest, NextResponse } from "next/server";
import { dealerApiError, parseOptionalString } from "@/features/dealer/dealer-api-utils";
import type { DealerRFQItemInput } from "@/features/dealer/dealer-rfq.types";
import {
  isValidDealerRFQPriority,
  isValidDealerRFQProjectType,
} from "@/features/dealer/dealer-rfq.validation";
import {
  getDealerRFQForCompany,
  updateDealerRFQ,
} from "@/features/dealer/services/dealer-rfq.service";
import { requireApprovedDealerPortalFromCookies } from "@/lib/dealer-auth/require-dealer-portal";

type RouteContext = { params: Promise<{ id: string }> };

function parseItems(raw: unknown): DealerRFQItemInput[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      productId: typeof item.productId === "string" ? item.productId : null,
      variantId: typeof item.variantId === "string" ? item.variantId : null,
      productName: typeof item.productName === "string" ? item.productName : "",
      variantName: parseOptionalString(item.variantName),
      skuSnapshot: parseOptionalString(item.skuSnapshot),
      colorSnapshot: parseOptionalString(item.colorSnapshot),
      quantity: typeof item.quantity === "number" ? item.quantity : Number(item.quantity) || 0,
      decorationType: parseOptionalString(item.decorationType),
      position: parseOptionalString(item.position),
      note: parseOptionalString(item.note),
    }));
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const auth = await requireApprovedDealerPortalFromCookies();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  try {
    const rfq = await getDealerRFQForCompany(id, auth.session.companyId);
    if (!rfq) {
      return NextResponse.json({ message: "Không tìm thấy yêu cầu báo giá." }, { status: 404 });
    }
    return NextResponse.json({ rfq });
  } catch (err) {
    return dealerApiError(err, "Không thể tải RFQ.");
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = await requireApprovedDealerPortalFromCookies();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu JSON không hợp lệ." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Thiếu dữ liệu yêu cầu." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  try {
    const rfq = await updateDealerRFQ(
      id,
      {
        title: typeof raw.title === "string" ? raw.title : undefined,
        projectType:
          typeof raw.projectType === "string" && isValidDealerRFQProjectType(raw.projectType)
            ? raw.projectType
            : undefined,
        priority:
          typeof raw.priority === "string" && isValidDealerRFQPriority(raw.priority)
            ? raw.priority
            : undefined,
        contactName: raw.contactName !== undefined ? parseOptionalString(raw.contactName) : undefined,
        contactEmail: raw.contactEmail !== undefined ? parseOptionalString(raw.contactEmail) : undefined,
        contactPhone: raw.contactPhone !== undefined ? parseOptionalString(raw.contactPhone) : undefined,
        companyName: raw.companyName !== undefined ? parseOptionalString(raw.companyName) : undefined,
        productSummary:
          raw.productSummary !== undefined ? parseOptionalString(raw.productSummary) : undefined,
        quantity: raw.quantity !== undefined ? Number(raw.quantity) || null : undefined,
        targetBudget:
          raw.targetBudget !== undefined &&
          (typeof raw.targetBudget === "number" || typeof raw.targetBudget === "string")
            ? raw.targetBudget
            : undefined,
        deadline: raw.deadline !== undefined ? parseOptionalString(raw.deadline) : undefined,
        deliveryLocation:
          raw.deliveryLocation !== undefined ? parseOptionalString(raw.deliveryLocation) : undefined,
        artworkUrls: Array.isArray(raw.artworkUrls)
          ? raw.artworkUrls.filter((v): v is string => typeof v === "string")
          : typeof raw.artworkUrls === "string"
            ? raw.artworkUrls.split("\n").map((s) => s.trim()).filter(Boolean)
            : undefined,
        note: raw.note !== undefined ? parseOptionalString(raw.note) : undefined,
        items: parseItems(raw.items),
      },
      { dealerCompanyId: auth.session.companyId },
    );
    return NextResponse.json({ rfq });
  } catch (err) {
    return dealerApiError(err, "Không thể cập nhật RFQ.");
  }
}

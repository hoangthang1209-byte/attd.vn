import { NextRequest, NextResponse } from "next/server";
import { dealerApiError, parseOptionalString } from "@/features/dealer/dealer-api-utils";
import {
  isValidDealerRFQPriority,
  isValidDealerRFQProjectType,
  isValidDealerRFQStatus,
} from "@/features/dealer/dealer-rfq.validation";
import type { DealerRFQItemInput } from "@/features/dealer/dealer-rfq.types";
import {
  createDealerRFQ,
  listDealerRFQsForCompany,
} from "@/features/dealer/services/dealer-rfq.service";
import { requireApprovedDealerPortalFromCookies } from "@/lib/dealer-auth/require-dealer-portal";
import { requireDealerPermission } from "@/lib/permissions/require-dealer-permission";

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

function parseBody(raw: Record<string, unknown>) {
  return {
    title: typeof raw.title === "string" ? raw.title : "",
    projectType:
      typeof raw.projectType === "string" && isValidDealerRFQProjectType(raw.projectType)
        ? raw.projectType
        : undefined,
    priority:
      typeof raw.priority === "string" && isValidDealerRFQPriority(raw.priority)
        ? raw.priority
        : undefined,
    contactName: parseOptionalString(raw.contactName),
    contactEmail: parseOptionalString(raw.contactEmail),
    contactPhone: parseOptionalString(raw.contactPhone),
    companyName: parseOptionalString(raw.companyName),
    productSummary: parseOptionalString(raw.productSummary),
    quantity: typeof raw.quantity === "number" ? raw.quantity : Number(raw.quantity) || null,
    targetBudget:
      typeof raw.targetBudget === "number" || typeof raw.targetBudget === "string"
        ? raw.targetBudget
        : undefined,
    deadline: parseOptionalString(raw.deadline),
    deliveryLocation: parseOptionalString(raw.deliveryLocation),
    artworkUrls: Array.isArray(raw.artworkUrls)
      ? raw.artworkUrls.filter((v): v is string => typeof v === "string")
      : typeof raw.artworkUrls === "string"
        ? raw.artworkUrls.split("\n").map((s) => s.trim()).filter(Boolean)
        : undefined,
    note: parseOptionalString(raw.note),
    items: parseItems(raw.items),
    submit: raw.submit === true,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireApprovedDealerPortalFromCookies();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  if (statusParam && !isValidDealerRFQStatus(statusParam)) {
    return NextResponse.json({ message: "Trạng thái không hợp lệ." }, { status: 400 });
  }
  const priorityParam = searchParams.get("priority");
  const projectTypeParam = searchParams.get("projectType");

  try {
    const result = await listDealerRFQsForCompany(auth.session.companyId, {
      search: searchParams.get("search") ?? undefined,
      status: statusParam && isValidDealerRFQStatus(statusParam) ? statusParam : undefined,
      priority:
        priorityParam && isValidDealerRFQPriority(priorityParam) ? priorityParam : undefined,
      projectType:
        projectTypeParam && isValidDealerRFQProjectType(projectTypeParam)
          ? projectTypeParam
          : undefined,
      limit: Number(searchParams.get("limit") ?? undefined) || undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return dealerApiError(err, "Không thể tải danh sách RFQ.");
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireDealerPermission({
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu JSON không hợp lệ." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Thiếu dữ liệu yêu cầu." }, { status: 400 });
  }

  try {
    const parsed = parseBody(body as Record<string, unknown>);
    const rfq = await createDealerRFQ({
      ...parsed,
      dealerCompanyId: permission.session.companyId,
      dealerUserId: permission.session.userId,
    });
    return NextResponse.json({ rfq }, { status: 201 });
  } catch (err) {
    return dealerApiError(err, "Không thể tạo RFQ.");
  }
}

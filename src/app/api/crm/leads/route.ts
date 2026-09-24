import { NextRequest, NextResponse } from "next/server";
import type { LeadPriority, LeadSource, LeadStatus } from "@prisma/client";
import {
  getCrmDiagnostics,
  isCrmLeadTableReady,
  isValidLeadPriority,
  isValidLeadSource,
  isValidLeadStatus,
  listCrmLeads,
} from "@/features/crm/services/crm-lead.service";
import {
  intakeLead,
  LeadIntakeValidationError,
} from "@/features/crm/services/lead-intake.service";
import type { CreateProductInterestInput } from "@/features/crm/types";
import {
  assertCanViewCrmLeads,
  resolveCrmLeadListAssignedToFilter,
} from "@/features/crm/services/crm-lead-access";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  try {
    assertCanViewCrmLeads(session);
  } catch {
    return NextResponse.json(
      { message: "Bạn không có quyền xem CRM leads." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const sourceParam = searchParams.get("source") ?? undefined;
  const statusParam = searchParams.get("status") ?? undefined;
  const priorityParam = searchParams.get("priority") ?? undefined;
  const assignedTo = resolveCrmLeadListAssignedToFilter(
    session,
    searchParams.get("assignedTo") ?? undefined
  );
  const overdueOnly = searchParams.get("overdueOnly") === "1";
  const debug = searchParams.get("debug") === "1";

  if (sourceParam && !isValidLeadSource(sourceParam)) {
    return NextResponse.json({ message: "Nguồn không hợp lệ" }, { status: 400 });
  }
  if (statusParam && !isValidLeadStatus(statusParam)) {
    return NextResponse.json({ message: "Trạng thái không hợp lệ" }, { status: 400 });
  }
  if (priorityParam && !isValidLeadPriority(priorityParam)) {
    return NextResponse.json({ message: "Ưu tiên không hợp lệ" }, { status: 400 });
  }

  try {
    const tableReady = await isCrmLeadTableReady();
    const result = await listCrmLeads({
      search,
      source: sourceParam as LeadSource | undefined,
      status: statusParam as LeadStatus | undefined,
      priority: priorityParam as LeadPriority | undefined,
      assignedTo,
      overdueOnly,
    });

    if (result.error) {
      const diagnostics = debug ? await getCrmDiagnostics() : undefined;
      return NextResponse.json(
        { tableReady, ...result, diagnostics },
        { status: tableReady ? 500 : 503 }
      );
    }

    const diagnostics = debug ? await getCrmDiagnostics() : undefined;
    return NextResponse.json({ tableReady, ...result, diagnostics });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể tải CRM leads";
    console.error("[GET /api/crm/leads]", err);
    return NextResponse.json(
      {
        tableReady: false,
        leads: [],
        total: 0,
        error: message,
        diagnostics: await getCrmDiagnostics().catch(() => null),
      },
      { status: 500 }
    );
  }
}

function parseProductInterest(raw: unknown): CreateProductInterestInput | null {
  if (!raw || typeof raw !== "object") return null;
  const pi = raw as Record<string, unknown>;
  const serviceNeedsRaw = pi.serviceNeeds;
  let serviceNeeds: Record<string, boolean> | null = null;
  if (serviceNeedsRaw && typeof serviceNeedsRaw === "object" && !Array.isArray(serviceNeedsRaw)) {
    serviceNeeds = serviceNeedsRaw as Record<string, boolean>;
  }

  return {
    productId: typeof pi.productId === "string" ? pi.productId : null,
    variantId: typeof pi.variantId === "string" ? pi.variantId : null,
    productNameSnapshot:
      typeof pi.productNameSnapshot === "string" ? pi.productNameSnapshot : null,
    quantity: typeof pi.quantity === "number" ? pi.quantity : null,
    unit: typeof pi.unit === "string" ? pi.unit : null,
    requirementNote: typeof pi.requirementNote === "string" ? pi.requirementNote : null,
    serviceNeeds,
  };
}

function parseProductInterests(raw: unknown): CreateProductInterestInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseProductInterest).filter((item): item is CreateProductInterestInput => item !== null);
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
  const adminMode = raw.adminMode === true;

  const contactName = typeof raw.contactName === "string" ? raw.contactName.trim() : "";
  const companyName = typeof raw.companyName === "string" ? raw.companyName.trim() : "";
  const fullName = typeof raw.fullName === "string" ? raw.fullName.trim() : "";
  const phone = typeof raw.phone === "string" ? raw.phone.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const source = typeof raw.source === "string" ? raw.source : "WEBSITE";

  if (adminMode) {
    const permission = await requireAdminPermission({
      platform: "crm",
      action: "create",
      request: req,
    });
    if (!permission.ok) return permission.response;

    if (!contactName && !companyName && !phone && !email && !fullName) {
      return NextResponse.json(
        { message: "Vui lòng nhập ít nhất một trong: tên liên hệ, công ty, SĐT hoặc email" },
        { status: 400 }
      );
    }
    if (!isValidLeadSource(source)) {
      return NextResponse.json({ message: "Nguồn không hợp lệ" }, { status: 400 });
    }

    const status =
      typeof raw.status === "string" && isValidLeadStatus(raw.status)
        ? raw.status
        : undefined;
    const priority =
      typeof raw.priority === "string" && isValidLeadPriority(raw.priority)
        ? raw.priority
        : undefined;

    const nextFollowUpAt =
      typeof raw.nextFollowUpAt === "string" && raw.nextFollowUpAt
        ? new Date(raw.nextFollowUpAt)
        : null;
    if (nextFollowUpAt && Number.isNaN(nextFollowUpAt.getTime())) {
      return NextResponse.json({ message: "Follow-up không hợp lệ" }, { status: 400 });
    }

    const estimatedValue =
      typeof raw.estimatedValue === "number"
        ? raw.estimatedValue
        : typeof raw.estimatedValue === "string" && raw.estimatedValue
          ? Number(raw.estimatedValue.replace(/[^\d.]/g, ""))
          : null;

    const productInterests = parseProductInterests(raw.productInterests);
    const singleInterest = parseProductInterest(raw.productInterest);

    try {
      const result = await intakeLead({
        channel: "MANUAL",
        contactName: contactName || fullName || null,
        companyName: companyName || null,
        phone: phone || undefined,
        email: email || null,
        zalo: typeof raw.zalo === "string" ? raw.zalo : null,
        source: source as LeadSource,
        sourceDetail: typeof raw.sourceDetail === "string" ? raw.sourceDetail : null,
        demand: typeof raw.demand === "string" ? raw.demand : null,
        note: typeof raw.note === "string" ? raw.note : null,
        status,
        priority,
        nextFollowUpAt,
        assignedSalesId:
          typeof raw.assignedTo === "string" ? raw.assignedTo : null,
        estimatedValue: Number.isFinite(estimatedValue!) ? estimatedValue : null,
        productInterests:
          productInterests.length > 0
            ? productInterests
            : singleInterest
              ? [singleInterest]
              : [],
      });

      if (!result) {
        return NextResponse.json({ message: "Không thể tạo lead" }, { status: 500 });
      }
      return NextResponse.json(
        { lead: result.lead, created: result.created },
        { status: result.created ? 201 : 200 }
      );
    } catch (err) {
      if (err instanceof LeadIntakeValidationError) {
        return NextResponse.json({ message: err.message }, { status: 400 });
      }
      throw err;
    }
  }

  if (!fullName) {
    return NextResponse.json({ message: "Họ tên là bắt buộc" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ message: "Số điện thoại là bắt buộc" }, { status: 400 });
  }
  if (!isValidLeadSource(source)) {
    return NextResponse.json({ message: "Nguồn không hợp lệ" }, { status: 400 });
  }

  const status =
    typeof raw.status === "string" && isValidLeadStatus(raw.status) ? raw.status : undefined;

  const followUpAt =
    typeof raw.followUpAt === "string" && raw.followUpAt ? new Date(raw.followUpAt) : null;

  if (followUpAt && Number.isNaN(followUpAt.getTime())) {
    return NextResponse.json({ message: "Follow-up không hợp lệ" }, { status: 400 });
  }

  const result = await intakeLead({
    channel: "WEBSITE",
    fullName,
    phone,
    email: typeof raw.email === "string" ? raw.email : null,
    companyName: typeof raw.company === "string" ? raw.company : null,
    source: source as LeadSource,
    message: typeof raw.message === "string" ? raw.message : null,
    status,
    nextFollowUpAt: followUpAt,
  });

  if (!result) {
    return NextResponse.json(
      { message: "Không thể tạo lead. Kiểm tra migration CRM." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { lead: result.lead, created: result.created },
    { status: result.created ? 201 : 200 }
  );
}

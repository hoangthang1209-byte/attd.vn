import { NextRequest, NextResponse } from "next/server";
import type { LeadSource, LeadStatus } from "@prisma/client";
import {
  createCrmLead,
  getCrmDiagnostics,
  isCrmLeadTableReady,
  isValidLeadSource,
  isValidLeadStatus,
  listCrmLeads,
} from "@/features/crm/services/crm-lead.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const sourceParam = searchParams.get("source") ?? undefined;
  const statusParam = searchParams.get("status") ?? undefined;
  const debug = searchParams.get("debug") === "1";

  if (sourceParam && !isValidLeadSource(sourceParam)) {
    return NextResponse.json({ message: "Nguồn không hợp lệ" }, { status: 400 });
  }
  if (statusParam && !isValidLeadStatus(statusParam)) {
    return NextResponse.json({ message: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  try {
    const tableReady = await isCrmLeadTableReady();
    const result = await listCrmLeads({
      search,
      source: sourceParam as LeadSource | undefined,
      status: statusParam as LeadStatus | undefined,
    });

    if (result.error) {
      const diagnostics = debug ? await getCrmDiagnostics() : undefined;
      return NextResponse.json(
        {
          tableReady,
          ...result,
          diagnostics,
        },
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
  const fullName = typeof raw.fullName === "string" ? raw.fullName.trim() : "";
  const phone = typeof raw.phone === "string" ? raw.phone.trim() : "";
  const source = typeof raw.source === "string" ? raw.source : "";

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
    typeof raw.status === "string" && isValidLeadStatus(raw.status)
      ? raw.status
      : undefined;

  const followUpAt =
    typeof raw.followUpAt === "string" && raw.followUpAt
      ? new Date(raw.followUpAt)
      : null;

  if (followUpAt && Number.isNaN(followUpAt.getTime())) {
    return NextResponse.json({ message: "Follow-up không hợp lệ" }, { status: 400 });
  }

  const lead = await createCrmLead({
    fullName,
    phone,
    email: typeof raw.email === "string" ? raw.email : null,
    company: typeof raw.company === "string" ? raw.company : null,
    source,
    message: typeof raw.message === "string" ? raw.message : null,
    status,
    followUpAt,
  });

  if (!lead) {
    return NextResponse.json(
      { message: "Không thể tạo lead. Kiểm tra migration CRM." },
      { status: 500 }
    );
  }

  return NextResponse.json({ lead }, { status: 201 });
}

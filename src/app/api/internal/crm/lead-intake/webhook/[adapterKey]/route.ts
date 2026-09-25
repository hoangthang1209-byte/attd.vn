import { NextRequest, NextResponse } from "next/server";
import { resolveRegisteredLeadIntakeAdapter } from "@/features/crm/lead-intake/adapter-registry";
import { runLeadIntakeAdapter } from "@/features/crm/lead-intake/run-intake-adapter";
import { LeadIntakeValidationError } from "@/features/crm/lead-intake.types";
import { authorizeLeadIntakeRequest } from "@/features/crm/lead-intake.utils";

function authorizeLeadIntake(req: NextRequest): boolean {
  return authorizeLeadIntakeRequest({
    authorizationHeader: req.headers.get("authorization"),
    cronSecretHeader: req.headers.get("x-cron-secret"),
    configuredSecret:
      process.env.LEAD_INTAKE_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim(),
  });
}

type RouteContext = { params: Promise<{ adapterKey: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { adapterKey } = await context.params;

  if (!authorizeLeadIntake(req)) {
    const configured = Boolean(
      process.env.LEAD_INTAKE_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim()
    );
    if (!configured) {
      return NextResponse.json(
        {
          message:
            "LEAD_INTAKE_CRON_SECRET (hoặc CRON_SECRET) chưa cấu hình — webhook intake inactive.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const adapter = resolveRegisteredLeadIntakeAdapter(adapterKey);
  if (!adapter || !adapterKey.startsWith("webhook-")) {
    return NextResponse.json({ message: "Adapter không hỗ trợ webhook." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  try {
    const result = await runLeadIntakeAdapter(adapter, body);
    if (!result) {
      return NextResponse.json(
        { message: "Không thể lưu lead. Kiểm tra migration CRM." },
        { status: 500 }
      );
    }

    const { adapterKey: _key, ...payload } = result;
    return NextResponse.json(payload, { status: result.created ? 201 : 200 });
  } catch (err) {
    if (err instanceof LeadIntakeValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error(`[POST /api/internal/crm/lead-intake/webhook/${adapterKey}]`, err);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}

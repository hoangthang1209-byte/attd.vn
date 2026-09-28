import { NextRequest, NextResponse } from "next/server";
import { LeadIntakeValidationError } from "@/features/crm/lead-intake.types";
import { intakeLeadFromGmail } from "@/features/crm/services/lead-intake.service";

/**
 * Trusted Gmail intake adapter boundary.
 * Auth: Authorization: Bearer <LEAD_INTAKE_CRON_SECRET> or x-cron-secret header.
 * Falls back to CRON_SECRET for CI/dev parity with other internal processors.
 * No Gmail credentials in repo — caller supplies normalized payload only.
 */
function authorizeLeadIntake(req: NextRequest): boolean {
  const secret =
    process.env.LEAD_INTAKE_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = req.headers.get("authorization") ?? "";
  const headerSecret = req.headers.get("x-cron-secret") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return bearer === secret || headerSecret === secret;
}

export async function POST(req: NextRequest) {
  if (!authorizeLeadIntake(req)) {
    const configured = Boolean(
      process.env.LEAD_INTAKE_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim()
    );
    if (!configured) {
      return NextResponse.json(
        {
          message:
            "LEAD_INTAKE_CRON_SECRET (hoặc CRON_SECRET) chưa cấu hình — Gmail intake inactive trên host này.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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

  const raw = body as Record<string, unknown>;

  try {
    const result = await intakeLeadFromGmail({
      messageId: typeof raw.messageId === "string" ? raw.messageId : "",
      threadId: typeof raw.threadId === "string" ? raw.threadId : null,
      senderName: typeof raw.senderName === "string" ? raw.senderName : null,
      senderEmail: typeof raw.senderEmail === "string" ? raw.senderEmail : null,
      subject: typeof raw.subject === "string" ? raw.subject : null,
      bodySnippet: typeof raw.bodySnippet === "string" ? raw.bodySnippet : null,
      receivedAt:
        typeof raw.receivedAt === "string" || raw.receivedAt instanceof Date
          ? (raw.receivedAt as string | Date)
          : null,
      assignedSalesId:
        typeof raw.assignedSalesId === "string" ? raw.assignedSalesId : null,
      intakeMetadata:
        raw.intakeMetadata && typeof raw.intakeMetadata === "object" && !Array.isArray(raw.intakeMetadata)
          ? (raw.intakeMetadata as Record<string, unknown>)
          : null,
    });

    if (!result) {
      return NextResponse.json(
        { message: "Không thể lưu lead. Kiểm tra migration CRM." },
        { status: 500 }
      );
    }

    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (err) {
    if (err instanceof LeadIntakeValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/internal/crm/lead-intake/gmail]", err);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}

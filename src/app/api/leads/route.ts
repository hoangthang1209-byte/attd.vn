import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { runLeadIntakeAdapter } from "@/features/crm/lead-intake/run-intake-adapter";
import type { PublicWebsiteLeadPayload } from "@/features/crm/lead-intake/adapters/website.adapter";
import {
  LEAD_INTAKE_WEBSITE_SITES,
  resolveWebsiteSiteFromHost,
} from "@/features/crm/lead-intake/taxonomy";
import { LeadIntakeValidationError } from "@/features/crm/lead-intake.types";
import { createWebsiteInboundAdapter } from "@/features/crm/lead-intake/adapters/website.adapter";

export async function GET() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leads);
}

function resolveRequestSite(request: Request) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  let host: string | null = null;
  if (origin) {
    try {
      host = new URL(origin).hostname;
    } catch {
      host = null;
    }
  }
  if (!host && referer) {
    try {
      host = new URL(referer).hostname;
    } catch {
      host = null;
    }
  }
  return resolveWebsiteSiteFromHost(host) ?? LEAD_INTAKE_WEBSITE_SITES.ATTD;
}

export async function POST(request: Request) {
  let body: PublicWebsiteLeadPayload;
  try {
    body = (await request.json()) as PublicWebsiteLeadPayload;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const site = resolveRequestSite(request);
  const adapter = createWebsiteInboundAdapter(site);

  try {
    const result = await runLeadIntakeAdapter(adapter, body);
    if (!result) {
      return NextResponse.json(
        { message: "Không thể lưu lead. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    return NextResponse.json(result.lead, { status: result.created ? 201 : 200 });
  } catch (err) {
    if (err instanceof LeadIntakeValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/leads]", err);
    return NextResponse.json({ message: "Không thể lưu lead. Vui lòng thử lại." }, { status: 500 });
  }
}

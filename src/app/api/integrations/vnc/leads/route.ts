import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  assertLeadIntakeRateLimit,
  buildDailyLeadIdempotencyKey,
  ingestCrmLead,
  LeadIntakeRateLimitError,
} from "@/features/crm/services/crm-lead-intake.service";

// Called only by a trusted website backend. Never expose this secret in browser code.
export async function POST(req: NextRequest) {
  const secret = process.env.VNC_LEAD_INGEST_SECRET;
  const provided = req.headers.get("x-vnc-ingest-key") ?? "";
  if (!secret || secret.length < 32 || !provided) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const expectedHash = createHash("sha256").update(secret).digest();
  const providedHash = createHash("sha256").update(provided).digest();
  if (!timingSafeEqual(expectedHash, providedHash)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) {
    return NextResponse.json({ message: "Payload too large" }, { status: 413 });
  }
  let data: unknown;
  try {
    const raw = await req.text();
    if (raw.length > 16_384) {
      return NextResponse.json({ message: "Payload too large" }, { status: 413 });
    }
    data = JSON.parse(raw);
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }
  const input = data as Record<string, unknown>;
  const value = (key: string, max: number) =>
    typeof input[key] === "string" ? (input[key] as string).trim().slice(0, max) : "";
  const name = value("name", 200);
  const company = value("company", 200);
  const phone = value("phone", 40);
  const email = value("email", 254);
  const message = value("message", 4000);
  const externalId = value("externalId", 200);
  if ((!name && !company) || (!phone && !email)) {
    return NextResponse.json({ message: "Name/company and phone/email required" }, { status: 400 });
  }
  if (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    return NextResponse.json({ message: "Invalid email" }, { status: 400 });
  }

  // Source is bound to this integration, not client-controlled.
  const channel = "WEBSITE_VIETNAMCLOTHING";
  const source = "WEBSITE" as const;
  try {
    await assertLeadIntakeRateLimit({ phone, email });
    const result = await ingestCrmLead({
      lead: {
        source,
        sourceDetail: "vietnamclothing.vn",
        fullName: name || company,
        contactName: name || null,
        companyName: company || null,
        phone: phone || undefined,
        email: email || null,
        message: message || null,
      },
      channel,
      externalId: externalId || null,
      idempotencyKey: buildDailyLeadIdempotencyKey({
        channel, source, phone, email,
        fingerprint: externalId || JSON.stringify({ name, company, message }),
      }),
      payload: { name, company, phone, email, message, externalId, origin: "vietnamclothing.vn" },
    });
    return NextResponse.json(
      { leadId: result.lead.id, deduplicated: result.deduplicated },
      { status: result.deduplicated ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof LeadIntakeRateLimitError) {
      return NextResponse.json({ message: error.message }, { status: 429 });
    }
    console.error("[VNC lead bridge]", error);
    return NextResponse.json({ message: "Unable to accept lead" }, { status: 500 });
  }
}

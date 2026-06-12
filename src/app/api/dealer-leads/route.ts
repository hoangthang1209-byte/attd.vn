import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ─── POST /api/dealer-leads (public) ─────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, message: "Request body missing." },
      { status: 400 }
    );
  }

  const raw = body as Record<string, unknown>;

  /** Trim, truncate to maxLen, return null when empty. */
  function sanitize(v: unknown, maxLen = 255): string | null {
    if (typeof v !== "string") return null;
    const t = v.trim().slice(0, maxLen);
    return t || null;
  }

  const contactName = sanitize(raw.contactName) ?? "";
  const phone = sanitize(raw.phone) ?? "";
  const companyName = sanitize(raw.companyName);
  const email = sanitize(raw.email);
  const city = sanitize(raw.city);
  const message = sanitize(raw.message, 2000);
  const source = sanitize(raw.source) ?? "WEBSITE";

  // Attribution fields — all optional, client-supplied, sanitized server-side
  const utmSource = sanitize(raw.utmSource);
  const utmMedium = sanitize(raw.utmMedium);
  const utmCampaign = sanitize(raw.utmCampaign);
  const utmTerm = sanitize(raw.utmTerm);
  const utmContent = sanitize(raw.utmContent);
  const referrer = sanitize(raw.referrer);
  const landingPage = sanitize(raw.landingPage);

  // Required field validation
  if (!contactName) {
    return NextResponse.json(
      { success: false, message: "Vui lòng nhập họ tên người liên hệ." },
      { status: 400 }
    );
  }
  if (!phone) {
    return NextResponse.json(
      { success: false, message: "Vui lòng nhập số điện thoại." },
      { status: 400 }
    );
  }

  // Length validation (after sanitize, these are already trimmed+capped)
  if (phone.length > 30) {
    return NextResponse.json(
      { success: false, message: "Số điện thoại không hợp lệ." },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.dealerLead.create({
      data: {
        contactName,
        phone,
        companyName,
        email,
        city,
        message,
        source,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        referrer,
        landingPage,
      },
      select: { id: true },
    });

    const total = await prisma.dealerLead.count();
    console.log(
      `[POST /api/dealer-leads] created id=${created.id} | total=${total}`
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/dealer-leads] DB error:", err);
    return NextResponse.json(
      { success: false, message: "Đã có lỗi xảy ra. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}

// ─── GET /api/dealer-leads (admin) ───────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const skip = (page - 1) * limit;

  try {
    const [leads, total] = await Promise.all([
      prisma.dealerLead.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.dealerLead.count(),
    ]);

    return NextResponse.json({ leads, total, page, limit });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[GET /api/dealer-leads] Prisma error:", err.code);
    }
    return NextResponse.json(
      { success: false, message: "Không thể tải dữ liệu." },
      { status: 500 }
    );
  }
}

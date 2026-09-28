import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createCrmLead } from "@/features/crm/services/crm-lead.service";
import {
  buildDailyLeadIdempotencyKey,
  ingestCrmLead,
} from "@/features/crm/services/crm-lead-intake.service";

export async function GET() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leads);
}

type ProductInquiryBody = {
  productId?: string | null;
  productName?: string | null;
  productUrl?: string | null;
  variantId?: string | null;
  variantLabel?: string | null;
  optionSelections?: Record<string, string | null> | null;
  moq?: number | null;
  leadTime?: string | null;
  quantity?: string | null;
  note?: string | null;
};

function parseQuantity(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const n = parseInt(value.replace(/[,\s]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function buildRequirementNote(inquiry: ProductInquiryBody): string | null {
  const lines: string[] = [];
  if (inquiry.productUrl?.trim()) lines.push(`URL: ${inquiry.productUrl.trim()}`);
  if (inquiry.variantLabel?.trim()) lines.push(`Biến thể: ${inquiry.variantLabel.trim()}`);
  if (inquiry.optionSelections) {
    const options = Object.entries(inquiry.optionSelections)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: ${value}`);
    if (options.length) lines.push(`Tùy chọn: ${options.join(", ")}`);
  }
  if (inquiry.moq != null) lines.push(`MOQ tham chiếu: ${inquiry.moq}`);
  if (inquiry.leadTime?.trim()) lines.push(`Lead time: ${inquiry.leadTime.trim()}`);
  if (inquiry.note?.trim()) {
    lines.push("---");
    lines.push(inquiry.note.trim());
  }
  return lines.length ? lines.join("\n") : null;
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ message: "Họ tên là bắt buộc" }, { status: 400 });
  }
  if (!body.phone?.trim()) {
    return NextResponse.json({ message: "Số điện thoại là bắt buộc" }, { status: 400 });
  }

  const fullName = body.name.trim();
  const phone = body.phone.trim();
  const email = body.email?.trim() || null;
  const company = body.company?.trim() || null;
  const message = body.message?.trim() || null;
  const inquiry = body.productInquiry as ProductInquiryBody | undefined;

  const source = inquiry?.productId ? "PRODUCT_INQUIRY" : "CONTACT";
  const leadInput = {
    fullName,
    phone,
    email,
    company,
    source,
    sourceDetail: inquiry?.productUrl?.trim() || null,
    message,
    ...(inquiry?.productId
      ? {
          productInterest: {
            productId: inquiry.productId,
            variantId: inquiry.variantId ?? null,
            productNameSnapshot: inquiry.productName ?? inquiry.variantLabel ?? null,
            quantity: parseQuantity(inquiry.quantity),
            requirementNote: buildRequirementNote(inquiry),
          },
        }
      : {}),
  } as const;

  try {
    const { lead, deduplicated } = await ingestCrmLead({
      lead: leadInput,
      channel: inquiry?.productId ? "WEBSITE_PRODUCT_INQUIRY" : "WEBSITE_CONTACT",
      idempotencyKey: buildDailyLeadIdempotencyKey({
        channel: inquiry?.productId ? "WEBSITE_PRODUCT_INQUIRY" : "WEBSITE_CONTACT",
        source,
        phone,
        email,
        fingerprint: JSON.stringify({
          productId: inquiry?.productId ?? null,
          variantId: inquiry?.variantId ?? null,
          quantity: inquiry?.quantity ?? null,
          message,
        }),
      }),
      payload: {
        name: fullName,
        phone,
        email,
        company,
        message,
        productId: inquiry?.productId ?? null,
        variantId: inquiry?.variantId ?? null,
        quantity: inquiry?.quantity ?? null,
      },
    });
    return NextResponse.json({ ...lead, deduplicated }, { status: deduplicated ? 200 : 201 });
  } catch (error) {
    console.error("[POST /api/leads]", error);
    return NextResponse.json(
      { message: "Không thể lưu lead. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}

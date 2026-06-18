import { NextRequest, NextResponse } from "next/server";
import { createCRMProductInterest } from "@/features/crm/services/crm-product-interest.service";

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
  const leadId = typeof raw.leadId === "string" ? raw.leadId : null;
  const customerId = typeof raw.customerId === "string" ? raw.customerId : null;

  if (!leadId && !customerId) {
    return NextResponse.json(
      { message: "Cần leadId hoặc customerId" },
      { status: 400 }
    );
  }

  const serviceNeedsRaw = raw.serviceNeeds;
  let serviceNeeds: Record<string, boolean> | null = null;
  if (serviceNeedsRaw && typeof serviceNeedsRaw === "object" && !Array.isArray(serviceNeedsRaw)) {
    serviceNeeds = serviceNeedsRaw as Record<string, boolean>;
  }

  const interest = await createCRMProductInterest({
    leadId,
    customerId,
    productId: typeof raw.productId === "string" ? raw.productId : null,
    variantId: typeof raw.variantId === "string" ? raw.variantId : null,
    productNameSnapshot:
      typeof raw.productNameSnapshot === "string" ? raw.productNameSnapshot : null,
    quantity: typeof raw.quantity === "number" ? raw.quantity : null,
    unit: typeof raw.unit === "string" ? raw.unit : null,
    requirementNote: typeof raw.requirementNote === "string" ? raw.requirementNote : null,
    serviceNeeds,
  });

  if (!interest) {
    return NextResponse.json({ message: "Không thể thêm sản phẩm quan tâm" }, { status: 500 });
  }

  return NextResponse.json({ interest }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import type { CustomerLegacyType, CustomerRepresentativeSalutation, CustomerStatus } from "@prisma/client";
import {
  createCustomer,
  isValidCustomerLegacyType,
  isValidCustomerStatus,
  isValidRepresentativeSalutationValue,
  listCustomers,
} from "@/features/crm/services/crm-customer.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

function parseOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const customerTypeId = searchParams.get("customerTypeId") ?? undefined;
  const unclassified = searchParams.get("unclassified") === "1";
  const legacyTypeParam = searchParams.get("type") ?? undefined;
  const statusParam = searchParams.get("status") ?? undefined;

  if (legacyTypeParam && !isValidCustomerLegacyType(legacyTypeParam)) {
    return NextResponse.json({ message: "Loại khách không hợp lệ" }, { status: 400 });
  }
  if (statusParam && !isValidCustomerStatus(statusParam)) {
    return NextResponse.json({ message: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  try {
    const result = await listCustomers({
      search,
      customerTypeId,
      unclassified,
      legacyType: legacyTypeParam as CustomerLegacyType | undefined,
      status: statusParam as CustomerStatus | undefined,
      limit: Number(searchParams.get("limit") ?? undefined) || undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/crm/customers]", err);
    return NextResponse.json({ message: "Không thể tải khách hàng" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

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
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) {
    return NextResponse.json({ message: "Tên khách hàng là bắt buộc" }, { status: 400 });
  }

  const legacyType =
    typeof raw.type === "string" && isValidCustomerLegacyType(raw.type) ? raw.type : undefined;
  const status =
    typeof raw.status === "string" && isValidCustomerStatus(raw.status)
      ? raw.status
      : undefined;
  const representativeSalutation =
    typeof raw.representativeSalutation === "string" &&
    isValidRepresentativeSalutationValue(raw.representativeSalutation)
      ? raw.representativeSalutation
      : raw.representativeSalutation === null
        ? null
        : undefined;

  let primaryContact = null;
  if (raw.primaryContact && typeof raw.primaryContact === "object") {
    const pc = raw.primaryContact as Record<string, unknown>;
    const fullName = typeof pc.fullName === "string" ? pc.fullName.trim() : "";
    if (fullName) {
      primaryContact = {
        fullName,
        title: parseOptionalString(pc.title),
        department: parseOptionalString(pc.department),
        phone: parseOptionalString(pc.phone),
        email: parseOptionalString(pc.email),
        zalo: parseOptionalString(pc.zalo),
        note: parseOptionalString(pc.note),
      };
    }
  }

  try {
    const customer = await createCustomer({
      customerTypeId: parseOptionalString(raw.customerTypeId),
      legacyType,
      name,
      legalName: parseOptionalString(raw.legalName),
      taxCode: parseOptionalString(raw.taxCode),
      phone: parseOptionalString(raw.phone),
      email: parseOptionalString(raw.email),
      website: parseOptionalString(raw.website),
      address: parseOptionalString(raw.address),
      province: parseOptionalString(raw.province),
      district: parseOptionalString(raw.district),
      provinceId: parseOptionalString(raw.provinceId),
      wardId: parseOptionalString(raw.wardId),
      provinceNameSnapshot: parseOptionalString(raw.provinceNameSnapshot),
      wardNameSnapshot: parseOptionalString(raw.wardNameSnapshot),
      addressLine1: parseOptionalString(raw.addressLine1),
      addressLine2: parseOptionalString(raw.addressLine2),
      representativeName: parseOptionalString(raw.representativeName),
      representativeSalutation: representativeSalutation as CustomerRepresentativeSalutation | null | undefined,
      representativeTitle: parseOptionalString(raw.representativeTitle),
      authorizationDocumentNo: parseOptionalString(raw.authorizationDocumentNo),
      status,
      note: parseOptionalString(raw.note),
      internalNote: parseOptionalString(raw.internalNote),
      billingNote: parseOptionalString(raw.billingNote),
      primaryContact,
    });

    if (!customer) {
      return NextResponse.json({ message: "Không thể tạo khách hàng" }, { status: 500 });
    }

    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/crm/customers]", err);
    return NextResponse.json({ message: "Không thể tạo khách hàng" }, { status: 500 });
  }
}

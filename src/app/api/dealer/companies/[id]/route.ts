import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  dealerApiError,
  parseOptionalString,
} from "@/features/dealer/dealer-api-utils";
import {
  isValidDealerCompanyStatus,
  isValidDealerCompanyType,
  isValidDealerLevel,
} from "@/features/dealer/dealer-validation";
import {
  getDealerCompanyById,
  updateDealerCompany,
} from "@/features/dealer/services/dealer-company.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const authError = await requireAdminApiFromCookies();
  if (authError) return authError;

  const { id } = await params;
  try {
    const company = await getDealerCompanyById(id);
    if (!company) {
      return NextResponse.json({ message: "Không tìm thấy đại lý." }, { status: 404 });
    }
    return NextResponse.json({ company });
  } catch (err) {
    return dealerApiError(err, "Không thể tải thông tin đại lý.");
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "dealer",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Dữ liệu JSON không hợp lệ." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Thiếu dữ liệu yêu cầu." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const status =
    typeof raw.status === "string" && isValidDealerCompanyStatus(raw.status)
      ? raw.status
      : undefined;
  const type =
    typeof raw.type === "string" && isValidDealerCompanyType(raw.type) ? raw.type : undefined;
  const level =
    typeof raw.level === "string" && isValidDealerLevel(raw.level) ? raw.level : undefined;

  try {
    const company = await updateDealerCompany(id, {
      name: typeof raw.name === "string" ? raw.name : undefined,
      legalName: raw.legalName !== undefined ? parseOptionalString(raw.legalName) : undefined,
      taxCode: raw.taxCode !== undefined ? parseOptionalString(raw.taxCode) : undefined,
      email: raw.email !== undefined ? parseOptionalString(raw.email) : undefined,
      phone: raw.phone !== undefined ? parseOptionalString(raw.phone) : undefined,
      website: raw.website !== undefined ? parseOptionalString(raw.website) : undefined,
      address: raw.address !== undefined ? parseOptionalString(raw.address) : undefined,
      city: raw.city !== undefined ? parseOptionalString(raw.city) : undefined,
      country:
        raw.country !== undefined
          ? parseOptionalString(raw.country) ?? "Vietnam"
          : undefined,
      notes: raw.notes !== undefined ? parseOptionalString(raw.notes) : undefined,
      type,
      level,
      status,
    });
    return NextResponse.json({ company });
  } catch (err) {
    return dealerApiError(err, "Không thể cập nhật đại lý.");
  }
}

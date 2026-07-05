import { NextRequest, NextResponse } from "next/server";
import {
  EmployeeValidationError,
  getEmployeeById,
  parseEmployeeRoleInput,
  updateEmployee,
} from "@/features/employees/employee.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const employee = await getEmployeeById(id);
  if (!employee) {
    return NextResponse.json({ message: "Không tìm thấy nhân viên" }, { status: 404 });
  }
  return NextResponse.json({ employee });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "operations",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
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
    const employee = await updateEmployee(id, {
      fullName: typeof raw.fullName === "string" ? raw.fullName : undefined,
      jobTitle: typeof raw.jobTitle === "string" ? raw.jobTitle : raw.jobTitle === null ? null : undefined,
      department: typeof raw.department === "string" ? raw.department : raw.department === null ? null : undefined,
      role: parseEmployeeRoleInput(raw.role),
      phone: typeof raw.phone === "string" ? raw.phone : raw.phone === null ? null : undefined,
      email: typeof raw.email === "string" ? raw.email : raw.email === null ? null : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
    });
    return NextResponse.json({ employee });
  } catch (err) {
    if (err instanceof EmployeeValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/employees/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật nhân viên" }, { status: 500 });
  }
}

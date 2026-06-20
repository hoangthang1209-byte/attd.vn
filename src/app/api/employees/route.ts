import { NextRequest, NextResponse } from "next/server";
import {
  createEmployee,
  EmployeeValidationError,
  listEmployees,
  parseEmployeeRoleInput,
} from "@/features/employees/employee.service";
import { isEmployeeRole } from "@/features/employees/employee-role";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    const roleParam = searchParams.get("role");
    const result = await listEmployees({
      search: searchParams.get("search") ?? undefined,
      activeOnly: searchParams.get("active") === "1",
      role:
        roleParam && isEmployeeRole(roleParam)
          ? roleParam
          : undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 100,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/employees]", err);
    return NextResponse.json({ message: "Không thể tải danh sách nhân viên" }, { status: 500 });
  }
}

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
  try {
    const employee = await createEmployee({
      fullName: typeof raw.fullName === "string" ? raw.fullName : "",
      jobTitle: typeof raw.jobTitle === "string" ? raw.jobTitle : null,
      department: typeof raw.department === "string" ? raw.department : null,
      role: parseEmployeeRoleInput(raw.role) ?? null,
      phone: typeof raw.phone === "string" ? raw.phone : null,
      email: typeof raw.email === "string" ? raw.email : null,
      isActive: raw.isActive !== false,
    });
    return NextResponse.json({ employee }, { status: 201 });
  } catch (err) {
    if (err instanceof EmployeeValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/employees]", err);
    return NextResponse.json({ message: "Không thể tạo nhân viên" }, { status: 500 });
  }
}

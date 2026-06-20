import { prisma } from "@/lib/prisma";

export class EmployeeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmployeeValidationError";
  }
}

export type EmployeeRecord = {
  id: string;
  employeeCode: string;
  fullName: string;
  jobTitle: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateEmployeeInput = {
  fullName: string;
  jobTitle?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
};

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

function mapRow(row: {
  id: string;
  employeeCode: string;
  fullName: string;
  jobTitle: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): EmployeeRecord {
  return {
    id: row.id,
    employeeCode: row.employeeCode,
    fullName: row.fullName,
    jobTitle: row.jobTitle,
    department: row.department,
    phone: row.phone,
    email: row.email,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function generateEmployeeCode(): Promise<string> {
  const rows = await prisma.employee.findMany({ select: { employeeCode: true } });
  let max = 0;
  for (const row of rows) {
    const match = row.employeeCode.match(/^NV-(\d+)$/);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `NV-${String(max + 1).padStart(6, "0")}`;
}

export async function listEmployees(params?: {
  search?: string;
  activeOnly?: boolean;
  includeInactive?: boolean;
  limit?: number;
}) {
  const search = params?.search?.trim();
  const where: {
    isActive?: boolean;
    OR?: Array<Record<string, unknown>>;
  } = {};
  if (params?.activeOnly) where.isActive = true;
  if (search) {
    where.OR = [
      { employeeCode: { contains: search, mode: "insensitive" } },
      { fullName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { department: { contains: search, mode: "insensitive" } },
    ];
  }

  const limit = Math.min(200, Math.max(1, params?.limit ?? 100));
  const [rows, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
      take: limit,
    }),
    prisma.employee.count({ where }),
  ]);

  return { employees: rows.map(mapRow), total };
}

export async function getEmployeeById(id: string): Promise<EmployeeRecord | null> {
  const row = await prisma.employee.findUnique({ where: { id } });
  return row ? mapRow(row) : null;
}

export async function createEmployee(input: CreateEmployeeInput): Promise<EmployeeRecord> {
  const fullName = input.fullName.trim();
  if (!fullName) throw new EmployeeValidationError("Họ tên nhân viên là bắt buộc.");

  const employeeCode = await generateEmployeeCode();
  const row = await prisma.employee.create({
    data: {
      employeeCode,
      fullName,
      jobTitle: input.jobTitle?.trim() || null,
      department: input.department?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      isActive: input.isActive ?? true,
    },
  });
  return mapRow(row);
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput): Promise<EmployeeRecord> {
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) throw new EmployeeValidationError("Không tìm thấy nhân viên.");

  const row = await prisma.employee.update({
    where: { id },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}),
      ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle?.trim() || null } : {}),
      ...(input.department !== undefined ? { department: input.department?.trim() || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
      ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  return mapRow(row);
}

export async function resolveEmployeeSnapshot(employeeId: string | null | undefined) {
  if (!employeeId) return { productionOwnerId: null, productionOwnerName: null };
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new EmployeeValidationError("Nhân viên phụ trách không hợp lệ.");
  if (!employee.isActive) throw new EmployeeValidationError("Nhân viên đã ngừng hoạt động.");
  return {
    productionOwnerId: employee.id,
    productionOwnerName: employee.fullName,
  };
}

import { NextResponse } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";
import { prisma } from "@/lib/prisma";
import {
  saveManufacturingWorkflowAdmin,
  ManufacturingAdminValidationError,
  type ManufacturingWorkflowAdminInput,
} from "@/features/manufacturing-library/manufacturing-admin.service";

function forbidden() {
  return NextResponse.json({ message: "Không có quyền truy cập" }, { status: 403 });
}

export async function GET() {
  const session = await getAdminSessionFromCookies();
  if (!can(session, "manufacturingWorkflow.manage")) return forbidden();
  const workflows = await prisma.manufacturingWorkflowTemplate.findMany({
    include: {
      steps: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      _count: { select: { assets: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ workflows });
}

export async function POST(request: Request) {
  const session = await getAdminSessionFromCookies();
  if (!can(session, "manufacturingWorkflow.manage")) return forbidden();
  try {
    const workflow = await saveManufacturingWorkflowAdmin(
      (await request.json()) as ManufacturingWorkflowAdminInput,
    );
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    const status = error instanceof ManufacturingAdminValidationError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Không thể lưu quy trình";
    return NextResponse.json({ message }, { status });
  }
}

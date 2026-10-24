import { NextRequest, NextResponse } from "next/server";
import { requireAutomationDashboardPermission } from "@/features/automation/automation-api-auth";
import { parseAgentRunsIssueNumber } from "@/features/agent-os/agent-run.query";
import type { CtoLoopVisibility } from "@/features/agent-os/cto-loop.types";

type CtoLoopLoader = {
  getCtoLoopVisibilityForIssue: (issueNumber: number) => Promise<CtoLoopVisibility | null>;
};

async function loadCtoLoopService(): Promise<CtoLoopLoader> {
  return import("@/features/agent-os/cto-loop.read.service");
}

export async function handleCtoLoopGet(
  request: NextRequest,
  loadService: () => Promise<CtoLoopLoader> = loadCtoLoopService,
) {
  const permission = await requireAutomationDashboardPermission(request);
  if (!permission.ok) return permission.response;

  const issueNumber = parseAgentRunsIssueNumber(request.nextUrl.searchParams.get("issueNumber"));
  if (issueNumber == null) {
    return NextResponse.json({ message: "Thiếu hoặc sai issueNumber" }, { status: 400 });
  }

  try {
    const { getCtoLoopVisibilityForIssue } = await loadService();
    const visibility = await getCtoLoopVisibilityForIssue(issueNumber);
    return NextResponse.json({ issueNumber, visibility });
  } catch (error) {
    console.error("[GET /api/admin/automation/cto-loop]", error);
    return NextResponse.json(
      { message: "Không thể tải trạng thái CTO loop (G3)" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleCtoLoopGet(request);
}

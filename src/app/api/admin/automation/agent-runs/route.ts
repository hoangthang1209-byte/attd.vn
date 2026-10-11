import { NextRequest, NextResponse } from "next/server";
import { requireAutomationDashboardPermission } from "@/features/automation/automation-api-auth";
import {
  parseAgentRunsIssueNumber,
  parseAgentRunsLimit,
} from "@/features/agent-os/agent-run.query";
import type { AgentRunHistoryResponse } from "@/features/agent-os/agent-run.types";

type AgentRunsLoader = {
  listAgentRunsForIssue: (input: {
    issueNumber: number;
    limit?: number;
  }) => Promise<Pick<AgentRunHistoryResponse, "currentRun" | "runs">>;
};

async function loadAgentRunsService(): Promise<AgentRunsLoader> {
  return import("@/features/agent-os/agent-run.read.service");
}

export async function handleAgentRunsGet(
  request: NextRequest,
  loadService: () => Promise<AgentRunsLoader> = loadAgentRunsService,
) {
  const permission = await requireAutomationDashboardPermission(request);
  if (!permission.ok) return permission.response;

  const issueNumber = parseAgentRunsIssueNumber(request.nextUrl.searchParams.get("issueNumber"));
  if (issueNumber == null) {
    return NextResponse.json({ message: "Thiếu hoặc sai issueNumber" }, { status: 400 });
  }

  const limit = parseAgentRunsLimit(request.nextUrl.searchParams.get("limit"));

  try {
    const { listAgentRunsForIssue } = await loadService();
    const { currentRun, runs } = await listAgentRunsForIssue({ issueNumber, limit });
    return NextResponse.json({
      issueNumber,
      currentRun,
      runs,
    });
  } catch (error) {
    console.error("[GET /api/admin/automation/agent-runs]", error);
    return NextResponse.json(
      { message: "Không thể tải lịch sử agent run" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleAgentRunsGet(request);
}

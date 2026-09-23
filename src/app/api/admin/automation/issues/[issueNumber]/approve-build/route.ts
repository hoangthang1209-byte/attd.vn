import { NextRequest, NextResponse } from "next/server";
import { approveBuildForIssue } from "@/features/automation/automation-approve-build.service";
import { requireAutomationDashboardPermission } from "@/features/automation/automation-api-auth";

type RouteContext = { params: Promise<{ issueNumber: string }> };

export async function handleApproveBuildPost(
  request: NextRequest,
  issueNumber: string,
  approveIssue: typeof approveBuildForIssue = approveBuildForIssue,
) {
  const permission = await requireAutomationDashboardPermission(request);
  if (!permission.ok) return permission.response;

  const result = await approveIssue(issueNumber);

  const statusByResult = {
    approved_now: 200,
    already_approved: 200,
    ineligible: 409,
    not_configured: 503,
    upstream_error: 502,
  } as const;

  return NextResponse.json(result, { status: statusByResult[result.result] });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { issueNumber } = await context.params;
  return handleApproveBuildPost(request, issueNumber);
}

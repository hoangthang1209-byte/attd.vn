import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listWorkflowTemplates } from "@/features/item-production-tracking/workflow-templates";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

export async function GET(req: NextRequest) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const templates = await listWorkflowTemplates();
  return NextResponse.json({ templates });
}

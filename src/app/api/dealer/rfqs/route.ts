import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiFromCookies } from "@/lib/admin-auth/require-admin";
import { dealerApiError } from "@/features/dealer/dealer-api-utils";
import {
  isValidDealerRFQPriority,
  isValidDealerRFQProjectType,
  isValidDealerRFQStatus,
} from "@/features/dealer/dealer-rfq.validation";
import { listDealerRFQs } from "@/features/dealer/services/dealer-rfq.service";

export async function GET(req: NextRequest) {
  const authError = await requireAdminApiFromCookies();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam && isValidDealerRFQStatus(statusParam) ? statusParam : undefined;
  const priorityParam = searchParams.get("priority");
  const priority =
    priorityParam && isValidDealerRFQPriority(priorityParam) ? priorityParam : undefined;
  const projectTypeParam = searchParams.get("projectType");
  const projectType =
    projectTypeParam && isValidDealerRFQProjectType(projectTypeParam)
      ? projectTypeParam
      : undefined;

  try {
    const result = await listDealerRFQs({
      search: searchParams.get("search") ?? undefined,
      status,
      priority,
      projectType,
      dealerCompanyId: searchParams.get("dealerCompanyId") ?? undefined,
      limit: Number(searchParams.get("limit") ?? undefined) || undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return dealerApiError(err, "Không thể tải danh sách RFQ.");
  }
}

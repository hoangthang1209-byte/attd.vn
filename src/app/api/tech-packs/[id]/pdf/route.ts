import { NextRequest } from "next/server";
import { getTechPackDetail } from "@/features/tech-pack/tech-pack.service";
import { TechPackValidationError } from "@/features/tech-pack/tech-pack.errors";
import { assertTechPackPdfAccess } from "@/features/tech-pack/pdf/tech-pack-pdf-scope";
import {
  buildTechPackPdfResponse,
  parseTechPackPdfDisposition,
} from "@/features/tech-pack/pdf/tech-pack-pdf-route";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const pack = await getTechPackDetail(id);
  if (!pack) {
    return Response.json({ message: "Không tìm thấy Tech Pack." }, { status: 404 });
  }

  try {
    await assertTechPackPdfAccess(auth.session, pack);
  } catch (err) {
    if (err instanceof TechPackValidationError) {
      return Response.json({ message: err.message }, { status: 403 });
    }
    throw err;
  }

  const disposition = parseTechPackPdfDisposition(
    req.nextUrl.searchParams.get("disposition"),
    req.nextUrl.searchParams.get("download"),
  );

  return buildTechPackPdfResponse(
    { route: "GET /api/tech-packs/[id]/pdf", techPackId: id },
    {
      code: pack.code,
      version: pack.version,
      requestHeaders: req.headers,
      disposition,
    },
  );
}

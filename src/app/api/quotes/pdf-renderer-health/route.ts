import { NextResponse } from "next/server";
import { runChromiumPdfHealthCheck } from "@/features/quotes/pdf/quote-chromium-health.server";
import { getQuotePdfTraceId } from "@/features/quotes/pdf/quote-pdf-chromium-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Chromium-only PDF renderer smoke test.
 * Available in development and Vercel preview — not in production.
 */
export async function GET() {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await runChromiumPdfHealthCheck();
    return NextResponse.json({
      ok: true,
      traceId: result.traceId,
      executablePath: result.executablePath,
      bytes: result.bytes,
    });
  } catch (err) {
    const traceId = getQuotePdfTraceId(err);
    return NextResponse.json(
      {
        ok: false,
        error: "Chromium PDF health check failed",
        detail: err instanceof Error ? err.message : String(err),
        ...(traceId ? { traceId } : {}),
      },
      {
        status: 500,
        headers: traceId ? { "X-Quote-Pdf-Trace-Id": traceId } : undefined,
      },
    );
  }
}

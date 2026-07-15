import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import {
  runGraphRetrievalEvaluation,
} from "@/features/knowledge-graph/evaluation/graph-retrieval-evaluator.service";
import type { AiRetrievalConsumer } from "@/features/ai-retrieval/ai-retrieval-types";

/**
 * POST /api/admin/knowledge-graph/evaluation/run
 * Runs baseline vs evaluation-only graph expansion. Does not flip production flags.
 */
export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: {
    benchmarkIds?: string[];
    consumers?: string[];
    depth?: number;
    persist?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const allowedConsumers: AiRetrievalConsumer[] = [
    "SEO_TOPIC_PLANNER",
    "SEO_BRIEF",
    "SEO_CONTENT",
  ];
  const consumers = (body.consumers?.length
    ? body.consumers.filter((c): c is AiRetrievalConsumer =>
        allowedConsumers.includes(c as AiRetrievalConsumer)
      )
    : ["SEO_TOPIC_PLANNER", "SEO_BRIEF"]) as AiRetrievalConsumer[];

  // SEO_CONTENT may be previewed but must not be enabled in production — evaluation only.
  try {
    const result = await runGraphRetrievalEvaluation({
      benchmarkIds: body.benchmarkIds,
      consumers,
      depth: body.depth === 2 ? 2 : 1,
      persist: body.persist !== false,
      requestedBy: permission.user.userId ?? null,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Evaluation failed" },
      { status: 500 }
    );
  }
}

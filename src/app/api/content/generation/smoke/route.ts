import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { parseJsonBody } from "@/features/content/seo/seo-api-utils";
import { getSmokeStatusSnapshot, runSmokeChecksAndSimulations } from "@/features/content-generation/services/smoke.wiring";
import { mapContentGenerationError } from "@/app/api/content/generation/_shared";

/**
 * Sprint 18.1 — AI Smoke Workspace.
 * GET: prerequisites/status snapshot (provider, rollout, quota, usage, test-topic presence) — read-only.
 * POST: runs smoke checks (PASS/WARNING/FAIL); with `{ mode: "simulate" }` also
 * runs safe TEST-provider-only Failure Lab scenarios against the known AI
 * test topic. Never mutates any AiGenerationRun row and never calls OpenAI.
 */
export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  try {
    const status = await getSmokeStatusSnapshot();
    return NextResponse.json({ status });
  } catch (err) {
    return mapContentGenerationError(err);
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const raw = (await parseJsonBody(req)) ?? {};
  const mode = raw.mode === "simulate" ? "simulate" : "check";
  const scenarios = Array.isArray(raw.scenarios) ? raw.scenarios.filter((s): s is string => typeof s === "string") : undefined;

  try {
    const result = await runSmokeChecksAndSimulations({ mode, scenarios });
    return NextResponse.json(result);
  } catch (err) {
    return mapContentGenerationError(err);
  }
}

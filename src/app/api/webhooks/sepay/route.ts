import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  parseSePayWebhookPayload,
  processSePayWebhook,
} from "@/features/banking/sepay-bank-transactions";

export const runtime = "nodejs";

const MAX_TIMESTAMP_DRIFT_SECONDS = 5 * 60;

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyHmac(req: NextRequest, rawBody: string, secret: string): boolean {
  const signature = req.headers.get("x-sepay-signature")?.trim();
  const timestampRaw = req.headers.get("x-sepay-timestamp")?.trim();
  if (!signature || !timestampRaw) return false;

  const timestamp = Number(timestampRaw);
  if (!Number.isFinite(timestamp)) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > MAX_TIMESTAMP_DRIFT_SECONDS) return false;

  const digest = createHmac("sha256", secret)
    .update(`${timestampRaw}.${rawBody}`, "utf8")
    .digest("hex");
  return safeEqual(signature, `sha256=${digest}`);
}

function verifyApiKey(req: NextRequest, apiKey: string): boolean {
  const authorization = req.headers.get("authorization")?.trim();
  if (!authorization?.startsWith("Apikey ")) return false;
  return safeEqual(authorization.slice("Apikey ".length).trim(), apiKey);
}

function authenticate(req: NextRequest, rawBody: string): "ok" | "invalid" | "unconfigured" {
  const secret = process.env.SEPAY_WEBHOOK_SECRET?.trim();
  if (secret) return verifyHmac(req, rawBody, secret) ? "ok" : "invalid";

  const apiKey = process.env.SEPAY_WEBHOOK_API_KEY?.trim();
  if (apiKey) return verifyApiKey(req, apiKey) ? "ok" : "invalid";

  return "unconfigured";
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const auth = authenticate(req, rawBody);

  if (auth === "unconfigured") {
    console.error("[SePay webhook] Authentication is not configured");
    return NextResponse.json({ success: false, message: "Webhook authentication is not configured" }, { status: 503 });
  }
  if (auth === "invalid") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const payload = parseSePayWebhookPayload(body);
    const result = await processSePayWebhook(payload);
    return NextResponse.json({
      success: true,
      duplicate: result.duplicate,
      matchStatus: result.matchStatus,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid SePay webhook payload" },
        { status: 400 },
      );
    }
    console.error("[SePay webhook] Failed to process transaction", error);
    return NextResponse.json(
      { success: false, message: "Unable to process transaction" },
      { status: 500 },
    );
  }
}

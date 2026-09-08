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

function allowedAccountNumbers(): Set<string> | null {
  const raw = process.env.SEPAY_ALLOWED_ACCOUNT_NUMBERS?.trim();
  if (!raw) return null;
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return values.length > 0 ? new Set(values) : null;
}

function successResponse() {
  // SePay requires this exact JSON body for a successful delivery.
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const auth = authenticate(req, rawBody);

  if (auth === "unconfigured") {
    console.error("[SePay webhook] Authentication is not configured");
    return NextResponse.json(
      { success: false, message: "Webhook authentication is not configured" },
      { status: 503 },
    );
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
    const allowedAccounts = allowedAccountNumbers();
    if (allowedAccounts && !allowedAccounts.has(payload.accountNumber.trim())) {
      // Acknowledge authenticated SePay events for other linked accounts so they
      // are not retried, but never let them reach ATTD payment reconciliation.
      console.warn("[SePay webhook] Ignored transaction for non-allowlisted account", {
        transactionId: payload.id,
        gateway: payload.gateway,
        accountNumberSuffix: payload.accountNumber.slice(-4),
      });
      return successResponse();
    }

    await processSePayWebhook(payload);
    return successResponse();
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

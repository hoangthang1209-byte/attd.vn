import { NextRequest, NextResponse } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { DATA_ACCESS_DENIED_MESSAGE } from "@/features/auth/admin-session.types";
import {
  BankTransactionValidationError,
  reconcileBankTransaction,
  type BankTransactionReconcileAction,
} from "@/features/banking/sepay-bank-transactions";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { assertFinancialApiAccess } from "@/lib/admin-auth/financial-access";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const session = getAdminSessionFromRequest(req);
  if (!can(session, "orders.update")) {
    return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }

  const forbidden = assertFinancialApiAccess(session, "POST /api/bank-transactions/[id]/reconcile");
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const action = typeof record.action === "string"
    ? record.action.trim().toUpperCase() as BankTransactionReconcileAction
    : null;
  if (action !== "MATCH" && action !== "IGNORE") {
    return NextResponse.json({ message: "Thao tác đối soát không hợp lệ" }, { status: 400 });
  }

  const orderNo = typeof record.orderNo === "string" ? record.orderNo : null;
  const note = typeof record.note === "string" ? record.note.slice(0, 500) : null;
  const { id } = await context.params;

  try {
    const result = await reconcileBankTransaction(id, { action, orderNo, note });
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof BankTransactionValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("[POST /api/bank-transactions/[id]/reconcile]", error);
    return NextResponse.json({ message: "Không thể đối soát giao dịch ngân hàng" }, { status: 500 });
  }
}

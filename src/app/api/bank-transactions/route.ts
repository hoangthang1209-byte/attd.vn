import { NextRequest, NextResponse } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { DATA_ACCESS_DENIED_MESSAGE } from "@/features/auth/admin-session.types";
import {
  BANK_TRANSACTION_STATUSES,
  listBankTransactions,
  type BankTransactionStatus,
} from "@/features/banking/sepay-bank-transactions";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { assertFinancialApiAccess } from "@/lib/admin-auth/financial-access";

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!can(session, "orders.view")) {
    return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }

  const forbidden = assertFinancialApiAccess(session, "GET /api/bank-transactions");
  if (forbidden) return forbidden;

  const { searchParams } = new URL(req.url);
  const statusRaw = searchParams.get("status")?.trim().toUpperCase();
  const status = statusRaw && BANK_TRANSACTION_STATUSES.includes(statusRaw as BankTransactionStatus)
    ? statusRaw as BankTransactionStatus
    : undefined;
  if (statusRaw && !status) {
    return NextResponse.json({ message: "Trạng thái giao dịch không hợp lệ" }, { status: 400 });
  }

  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : 100;
  if (!Number.isFinite(limit) || limit <= 0) {
    return NextResponse.json({ message: "limit không hợp lệ" }, { status: 400 });
  }

  try {
    const transactions = await listBankTransactions({ status, limit });
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("[GET /api/bank-transactions]", error);
    return NextResponse.json({ message: "Không thể tải giao dịch ngân hàng" }, { status: 500 });
  }
}

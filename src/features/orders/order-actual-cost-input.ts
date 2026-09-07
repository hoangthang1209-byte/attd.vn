import { isOrderActualCostCategory } from "@/features/orders/order-actual-cost-labels";
import type { UpsertOrderActualCostEntryInput } from "@/features/orders/order-actual-cost.types";
import { parseMoneyInput } from "@/features/pricing/parse-money";

export function parseUpsertActualCostEntryBody(
  body: Record<string, unknown>,
): UpsertOrderActualCostEntryInput {
  const category = body.category;
  if (!isOrderActualCostCategory(category)) {
    throw new Error("Loại chi phí không hợp lệ.");
  }

  const amountRaw = body.amount;
  let amount: number;
  if (typeof amountRaw === "number") {
    amount = amountRaw;
  } else if (typeof amountRaw === "string") {
    const parsed = parseMoneyInput(amountRaw);
    if (parsed == null) {
      throw new Error("Số tiền chi phí phải lớn hơn hoặc bằng 0.");
    }
    amount = parsed;
  } else {
    throw new Error("Số tiền chi phí phải lớn hơn hoặc bằng 0.");
  }
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Số tiền chi phí phải lớn hơn hoặc bằng 0.");
  }

  let orderItemId: string | null = null;
  if (body.orderItemId != null && body.orderItemId !== "") {
    if (typeof body.orderItemId !== "string") {
      throw new Error("Sản phẩm không hợp lệ.");
    }
    orderItemId = body.orderItemId;
  }

  return {
    category,
    amount,
    orderItemId,
    label: typeof body.label === "string" ? body.label : null,
    description: typeof body.description === "string" ? body.description : null,
  };
}

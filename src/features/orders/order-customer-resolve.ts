import { prisma } from "@/lib/prisma";
import {
  enrichOrderInputFromCrmSnapshots,
  type CrmContactSnapshotSource,
  type CrmCustomerSnapshotSource,
} from "@/features/crm/order-customer-snapshot";
import type { CreateManualOrderInput } from "@/features/orders/order.types";

export class OrderCustomerSnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderCustomerSnapshotError";
  }
}

export async function resolveOrderCustomerSnapshots(
  input: CreateManualOrderInput,
): Promise<CreateManualOrderInput> {
  if (!input.customerId) return input;

  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    include: {
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { fullName: "asc" }],
      },
    },
  });
  if (!customer) return input;

  let contact: CrmContactSnapshotSource | null = null;
  if (input.contactId) {
    const matched = customer.contacts.find((row) => row.id === input.contactId);
    if (!matched) {
      throw new OrderCustomerSnapshotError("Người liên hệ không thuộc khách hàng đã chọn.");
    }
    contact = matched;
  } else {
    const primary = customer.contacts.find((row) => row.isPrimary);
    if (primary) contact = primary;
  }

  return enrichOrderInputFromCrmSnapshots(
    input,
    customer as CrmCustomerSnapshotSource,
    contact,
  );
}

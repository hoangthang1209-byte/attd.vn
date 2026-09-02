"use client";

import CustomerQuickCreateDialog from "@/components/admin/crm/CustomerQuickCreateDialog";
import type { CrmContactRecord, CrmCustomerRecord } from "@/features/crm/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: CrmCustomerRecord, contact: CrmContactRecord | null) => void;
};

/** Order workspace quick-create — full CRM fields via shared dialog. */
export default function QuickAddCustomerModal(props: Props) {
  return (
    <CustomerQuickCreateDialog
      open={props.open}
      onClose={props.onClose}
      onCreated={props.onCreated}
      variant="full"
      contextLabel="đơn hàng này"
    />
  );
}

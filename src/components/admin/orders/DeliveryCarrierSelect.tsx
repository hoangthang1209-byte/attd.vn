"use client";

import { useState } from "react";
import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";
import QuickAddDeliveryCarrierModal from "@/components/admin/delivery/QuickAddDeliveryCarrierModal";
import type { DeliveryCarrierRecord } from "@/features/delivery/delivery-carrier.service";

type Props = {
  value: string;
  onChange: (value: string) => void;
  carriers: DeliveryCarrierRecord[];
  onCarriersChange: (carriers: DeliveryCarrierRecord[]) => void;
  legacyCarrierName?: string | null;
  disabled?: boolean;
  onCarrierCreated?: (carrier: DeliveryCarrierRecord) => void;
};

export default function DeliveryCarrierSelect({
  value,
  onChange,
  carriers,
  onCarriersChange,
  legacyCarrierName,
  disabled = false,
  onCarrierCreated,
}: Props) {
  const [quickOpen, setQuickOpen] = useState(false);

  const options = carriers.map((c) => ({
    value: c.id,
    label: c.name,
    sublabel: c.shortName ?? c.carrierCode,
  }));

  function handleCreated(carrier: DeliveryCarrierRecord) {
    const next = [...carriers.filter((c) => c.id !== carrier.id), carrier];
    onCarriersChange(next);
    onChange(carrier.id);
    onCarrierCreated?.(carrier);
  }

  return (
    <div className="admin-master-select">
      <AdminSearchableSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder="— Chọn đơn vị vận chuyển —"
        searchPlaceholder="Tìm đơn vị vận chuyển…"
        disabled={disabled}
      />
      {legacyCarrierName && !value && (
        <p className="admin-field-hint admin-legacy-hint">
          <span className="admin-legacy-label">Dữ liệu cũ:</span> {legacyCarrierName}
        </p>
      )}
      <button
        type="button"
        className="admin-btn admin-btn--link admin-master-select__action"
        onClick={() => setQuickOpen(true)}
        disabled={disabled}
      >
        Thêm đơn vị vận chuyển
      </button>
      <QuickAddDeliveryCarrierModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}

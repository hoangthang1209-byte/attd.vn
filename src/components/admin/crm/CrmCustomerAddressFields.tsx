"use client";

import { useEffect, useMemo, useState } from "react";
import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";
import {
  buildNormalizedAddressFromLegacy,
  formatCustomerAddressPreview,
  getLegacyAddressDisplay,
} from "@/features/crm/customer-address";

type ProvinceOption = { id: string; code: string; name: string };
type WardOption = { id: string; code: string; name: string; provinceId: string };

export type CrmAddressFieldValues = {
  provinceId: string;
  wardId: string;
  provinceNameSnapshot: string;
  wardNameSnapshot: string;
  addressLine1: string;
  addressLine2: string;
  address: string;
  province: string;
  district: string;
};

type Props = {
  values: CrmAddressFieldValues;
  onChange: (patch: Partial<CrmAddressFieldValues>) => void;
};

export default function CrmCustomerAddressFields({ values, onChange }: Props) {
  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [wards, setWards] = useState<WardOption[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/administrative/provinces")
      .then((res) => res.json())
      .then((data: { provinces?: ProvinceOption[] }) => {
        setProvinces(data.provinces ?? []);
      })
      .catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (!values.provinceId) {
      setWards([]);
      return;
    }
    setLoadingWards(true);
    void fetch(`/api/admin/administrative/wards?provinceId=${encodeURIComponent(values.provinceId)}`)
      .then((res) => res.json())
      .then((data: { wards?: WardOption[] }) => {
        setWards(data.wards ?? []);
      })
      .catch(() => setWards([]))
      .finally(() => setLoadingWards(false));
  }, [values.provinceId]);

  const provinceOptions = useMemo(
    () => provinces.map((p) => ({ value: p.id, label: p.name })),
    [provinces],
  );
  const wardOptions = useMemo(
    () => wards.map((w) => ({ value: w.id, label: w.name })),
    [wards],
  );

  const legacyAddress = getLegacyAddressDisplay(values);
  const preview = formatCustomerAddressPreview(values);

  function handleProvinceChange(provinceId: string) {
    const province = provinces.find((p) => p.id === provinceId);
    onChange({
      provinceId,
      wardId: "",
      provinceNameSnapshot: province?.name ?? "",
      wardNameSnapshot: "",
    });
  }

  function handleWardChange(wardId: string) {
    const ward = wards.find((w) => w.id === wardId);
    onChange({
      wardId,
      wardNameSnapshot: ward?.name ?? "",
    });
  }

  function handleNormalizeLegacy() {
    const normalized = buildNormalizedAddressFromLegacy(values);
    onChange({
      addressLine1: normalized.addressLine1 ?? values.addressLine1,
      provinceNameSnapshot: normalized.provinceNameSnapshot ?? values.provinceNameSnapshot,
      wardNameSnapshot: normalized.wardNameSnapshot ?? values.wardNameSnapshot,
    });
  }

  return (
    <div className="admin-form-grid">
      <label>
        Tỉnh / Thành phố
        <AdminSearchableSelect
          value={values.provinceId}
          onChange={handleProvinceChange}
          options={provinceOptions}
          placeholder="— Chọn tỉnh/thành phố —"
          searchPlaceholder="Tìm tỉnh/thành phố…"
          fallbackLabel={values.provinceNameSnapshot || undefined}
        />
      </label>
      <label>
        Phường / Xã
        <AdminSearchableSelect
          value={values.wardId}
          onChange={handleWardChange}
          options={wardOptions}
          placeholder={values.provinceId ? "— Chọn phường/xã —" : "Chọn tỉnh/thành phố trước"}
          searchPlaceholder="Tìm phường/xã…"
          disabled={!values.provinceId || loadingWards}
          fallbackLabel={values.wardNameSnapshot || undefined}
        />
      </label>
      <label className="admin-form-grid-span-2">
        Địa chỉ chi tiết
        <input
          className="admin-input"
          value={values.addressLine1}
          onChange={(e) => onChange({ addressLine1: e.target.value })}
          placeholder="Số nhà, đường, khu công nghiệp…"
        />
      </label>
      {legacyAddress && (
        <div className="admin-form-grid-span-2">
          <p className="admin-field-hint">Dữ liệu địa chỉ cũ: {legacyAddress}</p>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={handleNormalizeLegacy}>
            Chuẩn hóa địa chỉ
          </button>
        </div>
      )}
      {preview && (
        <p className="admin-field-hint admin-form-grid-span-2">Xem trước: {preview}</p>
      )}
    </div>
  );
}

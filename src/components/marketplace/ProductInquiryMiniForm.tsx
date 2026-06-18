"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ProductInquiryMiniFormProps = {
  productName?: string;
};

export default function ProductInquiryMiniForm({ productName }: ProductInquiryMiniFormProps) {
  const router = useRouter();
  const [qty, setQty] = useState("");
  const [need, setNeed] = useState("");
  const [phone, setPhone] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (productName) params.set("product", productName);
    if (qty.trim()) params.set("qty", qty.trim());
    if (need.trim()) params.set("need", need.trim());
    if (phone.trim()) params.set("phone", phone.trim());
    const qs = params.toString();
    router.push(qs ? `/lien-he?${qs}` : "/lien-he");
  }

  return (
    <form className="mp-pdp-inquiry-form" onSubmit={handleSubmit}>
      <label className="mp-pdp-inquiry-form-field">
        <span>Số lượng dự kiến</span>
        <input
          type="text"
          name="qty"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="VD: 100, 500..."
        />
      </label>
      <label className="mp-pdp-inquiry-form-field">
        <span>Nhu cầu</span>
        <input
          type="text"
          name="need"
          value={need}
          onChange={(e) => setNeed(e.target.value)}
          placeholder="In logo, thêu, OEM..."
        />
      </label>
      <label className="mp-pdp-inquiry-form-field">
        <span>SĐT / Zalo</span>
        <input
          type="tel"
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Số liên hệ"
        />
      </label>
      <button type="submit" className="btn-primary mp-inquiry-btn">
        Gửi yêu cầu
      </button>
    </form>
  );
}

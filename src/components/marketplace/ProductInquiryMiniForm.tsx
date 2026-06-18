"use client";

import { FormEvent, useState } from "react";

type FormStatus = "idle" | "loading" | "success" | "error";

type ProductInquiryMiniFormProps = {
  productName?: string;
  productCode?: string | null;
};

export default function ProductInquiryMiniForm({
  productName,
  productCode,
}: ProductInquiryMiniFormProps) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [need, setNeed] = useState("");
  const [phone, setPhone] = useState("");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMessage("Vui lòng nhập họ tên hoặc tên công ty.");
      setFormStatus("error");
      return;
    }
    if (!phone.trim()) {
      setErrorMessage("Vui lòng nhập số điện thoại.");
      setFormStatus("error");
      return;
    }

    setFormStatus("loading");
    setErrorMessage("");

    const messageParts = [
      productName && `Sản phẩm: ${productName}`,
      productCode && `Mã: ${productCode}`,
      qty.trim() && `Số lượng dự kiến: ${qty.trim()}`,
      need.trim() && `Nhu cầu: ${need.trim()}`,
    ].filter(Boolean);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          message: messageParts.join("\n") || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message ?? "Có lỗi xảy ra. Vui lòng thử lại.");
        setFormStatus("error");
        return;
      }

      setFormStatus("success");
      setName("");
      setQty("");
      setNeed("");
      setPhone("");
    } catch {
      setErrorMessage("Không thể kết nối. Vui lòng thử lại.");
      setFormStatus("error");
    }
  }

  if (formStatus === "success") {
    return (
      <div className="mp-pdp-inquiry-form-success">
        <p>Đã nhận yêu cầu! ATTD sẽ phản hồi trong 24 giờ làm việc.</p>
      </div>
    );
  }

  return (
    <form className="mp-pdp-inquiry-form" onSubmit={handleSubmit} noValidate>
      <label className="mp-pdp-inquiry-form-field">
        <span>Họ tên / Công ty</span>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên liên hệ"
          required
        />
      </label>
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
          required
        />
      </label>
      {errorMessage && (
        <p className="mp-pdp-inquiry-form-error" role="alert">
          {errorMessage}
        </p>
      )}
      <button
        type="submit"
        className="btn-primary mp-inquiry-btn"
        disabled={formStatus === "loading"}
      >
        {formStatus === "loading" ? "Đang gửi..." : "Gửi yêu cầu"}
      </button>
    </form>
  );
}

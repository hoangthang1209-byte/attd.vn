"use client";

import { useState } from "react";
import { trackGenerateLead } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";

const PROVINCES = [
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
  "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng",
  "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp",
  "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh",
  "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên",
  "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng",
  "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An",
  "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình",
  "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng",
  "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa",
  "Thừa Thiên Huế", "Tiền Giang", "TP. Hồ Chí Minh", "Trà Vinh",
  "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  fontSize: "15px",
  background: "#fff",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "14px",
  fontWeight: 500,
  marginBottom: "6px",
  color: "#374151",
};

const groupStyle: React.CSSProperties = { marginBottom: "20px" };

type FormStatus = "idle" | "loading" | "success" | "error";

interface DealerLeadFormProps {
  /** Identifier for the lead source (e.g. "DEALER_FORM", "OEM_PAGE") */
  source: string;
  /** Card heading — defaults to "Nhận báo giá" */
  title?: string;
}

export default function DealerLeadForm({
  source,
  title = "Nhận báo giá",
}: DealerLeadFormProps) {
  const [contactName, setContactName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Client-side validation
  function validate(): string | null {
    if (!contactName.trim()) return "Vui lòng nhập họ tên người liên hệ.";
    if (!phone.trim()) return "Vui lòng nhập số điện thoại.";
    if (phone.trim().length > 30) return "Số điện thoại không hợp lệ.";
    if (email.trim() && email.trim().length > 255) return "Email không hợp lệ.";
    if (message.trim().length > 2000) return "Nội dung quá dài (tối đa 2000 ký tự).";
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      setFormStatus("error");
      return;
    }

    setFormStatus("loading");
    setErrorMessage("");

    try {
      const attribution = getAttribution();

      const res = await fetch("/api/dealer-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: contactName.trim(),
          companyName: companyName.trim() || undefined,
          phone: phone.trim(),
          email: email.trim() || undefined,
          city: city || undefined,
          message: message.trim() || undefined,
          source,
          utmSource: attribution.utmSource,
          utmMedium: attribution.utmMedium,
          utmCampaign: attribution.utmCampaign,
          utmTerm: attribution.utmTerm,
          utmContent: attribution.utmContent,
          referrer: attribution.referrer,
          landingPage: attribution.landingPage,
        }),
      });

      const data = (await res.json()) as { success: boolean; message?: string };

      if (!res.ok || !data.success) {
        setErrorMessage(data.message ?? "Có lỗi xảy ra. Vui lòng thử lại.");
        setFormStatus("error");
        return;
      }

      trackGenerateLead(source);
      setFormStatus("success");
    } catch {
      setErrorMessage("Không thể kết nối. Vui lòng thử lại.");
      setFormStatus("error");
    }
  }

  if (formStatus === "success") {
    return (
      <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: "#dcfce7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: "24px",
          }}
        >
          ✓
        </div>
        <h2 style={{ margin: "0 0 12px", fontSize: "20px", color: "#111827" }}>
          Đã gửi thành công!
        </h2>
        <p style={{ color: "#6b7280", margin: 0, lineHeight: 1.7, fontSize: "15px" }}>
          Cảm ơn bạn. ATTD sẽ liên hệ trong thời gian sớm nhất.
        </p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h2 style={{ margin: "0 0 24px", fontSize: "20px", color: "#111827" }}>
        {title}
      </h2>

      {/* Company name (optional) */}
      <div style={groupStyle}>
        <label htmlFor={`companyName-${source}`} style={labelStyle}>
          Tên công ty / thương hiệu
        </label>
        <input
          id={`companyName-${source}`}
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Không bắt buộc"
          style={inputStyle}
        />
      </div>

      {/* Contact name (required) */}
      <div style={groupStyle}>
        <label htmlFor={`contactName-${source}`} style={labelStyle}>
          Họ tên người liên hệ <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          id={`contactName-${source}`}
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          style={inputStyle}
          required
          autoComplete="name"
        />
      </div>

      {/* Phone + Email */}
      <div
        style={{
          ...groupStyle,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        <div>
          <label htmlFor={`phone-${source}`} style={labelStyle}>
            Số điện thoại <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            id={`phone-${source}`}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
            required
            autoComplete="tel"
          />
        </div>
        <div>
          <label htmlFor={`email-${source}`} style={labelStyle}>
            Email
          </label>
          <input
            id={`email-${source}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Không bắt buộc"
            style={inputStyle}
            autoComplete="email"
          />
        </div>
      </div>

      {/* City */}
      <div style={groupStyle}>
        <label htmlFor={`city-${source}`} style={labelStyle}>
          Tỉnh / Thành phố
        </label>
        <select
          id={`city-${source}`}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={{ ...inputStyle, color: city ? "#111827" : "#9ca3af" }}
        >
          <option value="">Chọn tỉnh thành</option>
          {PROVINCES.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div style={groupStyle}>
        <label htmlFor={`message-${source}`} style={labelStyle}>
          Nhu cầu / Tin nhắn
        </label>
        <textarea
          id={`message-${source}`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Ví dụ: Cần báo giá áo thun trơn số lượng lớn, hỏi về OEM Private Label..."
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
          {message.length} / 2000
        </div>
      </div>

      {/* Error state */}
      {formStatus === "error" && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#dc2626",
            fontSize: "14px",
          }}
        >
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        className="btn-primary"
        disabled={formStatus === "loading"}
        style={{ width: "100%", opacity: formStatus === "loading" ? 0.7 : 1 }}
      >
        {formStatus === "loading" ? "Đang gửi..." : "Nhận báo giá"}
      </button>
    </form>
  );
}

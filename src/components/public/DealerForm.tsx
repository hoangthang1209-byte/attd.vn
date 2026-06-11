"use client";

import { useState } from "react";

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
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "14px",
  fontWeight: 500,
  marginBottom: "6px",
  color: "#374151",
};

const groupStyle: React.CSSProperties = {
  marginBottom: "20px",
};

type FormStatus = "idle" | "loading" | "success" | "error";

export default function DealerForm() {
  const [contactName, setContactName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [needs, setNeeds] = useState("");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    e.preventDefault();
    setFormStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/dealers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName, companyName, phone, email, city, needs }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message ?? "Có lỗi xảy ra. Vui lòng thử lại.");
        setFormStatus("error");
        return;
      }

      setFormStatus("success");
    } catch {
      setErrorMessage("Không thể kết nối. Vui lòng thử lại.");
      setFormStatus("error");
    }
  }

  if (formStatus === "success") {
    return (
      <div
        className="card"
        style={{ textAlign: "center", padding: "48px 32px" }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "#dcfce7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: "22px",
          }}
        >
          ✓
        </div>
        <h2 style={{ margin: "0 0 12px", fontSize: "22px" }}>
          Đã nhận đăng ký!
        </h2>
        <p style={{ color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
          Chúng tôi sẽ liên hệ lại trong vòng 24 giờ làm việc.
        </p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h2 style={{ margin: "0 0 24px", fontSize: "20px" }}>
        Thông tin đăng ký
      </h2>

      <div style={groupStyle}>
        <label htmlFor="contactName" style={labelStyle}>
          Họ tên <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          id="contactName"
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          style={inputStyle}
          required
        />
      </div>

      <div style={groupStyle}>
        <label htmlFor="companyName" style={labelStyle}>
          Công ty <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          id="companyName"
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          style={inputStyle}
          required
        />
      </div>

      <div
        style={{
          ...groupStyle,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        <div>
          <label htmlFor="phone" style={labelStyle}>
            Số điện thoại <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label htmlFor="email" style={labelStyle}>
            Email <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
        </div>
      </div>

      <div style={groupStyle}>
        <label htmlFor="city" style={labelStyle}>
          Tỉnh thành
        </label>
        <select
          id="city"
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

      <div style={groupStyle}>
        <label htmlFor="needs" style={labelStyle}>
          Nhu cầu
        </label>
        <textarea
          id="needs"
          value={needs}
          onChange={(e) => setNeeds(e.target.value)}
          rows={4}
          placeholder="Ví dụ: Tìm nguồn hàng áo thun trơn số lượng lớn, đặt hàng OEM theo thiết kế..."
          style={{
            ...inputStyle,
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>

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
        {formStatus === "loading" ? "Đang gửi..." : "Đăng ký ngay"}
      </button>
    </form>
  );
}

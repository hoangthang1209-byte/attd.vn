"use client";

import { useState } from "react";

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

export default function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    e.preventDefault();
    setFormStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, company, message }),
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
          Đã nhận yêu cầu!
        </h2>
        <p style={{ color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
          Chúng tôi sẽ phản hồi trong vòng 24 giờ làm việc.
        </p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h2 style={{ margin: "0 0 24px", fontSize: "20px" }}>
        Gửi yêu cầu báo giá
      </h2>

      <div style={groupStyle}>
        <label htmlFor="name" style={labelStyle}>
          Họ tên <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={groupStyle}>
        <label htmlFor="company" style={labelStyle}>
          Công ty
        </label>
        <input
          id="company"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={groupStyle}>
        <label htmlFor="message" style={labelStyle}>
          Nội dung yêu cầu
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Ví dụ: Báo giá áo thun trơn 500 cái, nhiều màu và size. Cần giao trong 2 tuần..."
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
        {formStatus === "loading" ? "Đang gửi..." : "Gửi yêu cầu"}
      </button>
    </form>
  );
}

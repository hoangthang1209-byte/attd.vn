"use client";

import { useState } from "react";
import B2BTrustSignals from "@/components/public/B2BTrustSignals";
import { CTA } from "@/lib/ctaConfig";

type FormStatus = "idle" | "loading" | "success" | "error";

const CONTACT_FORM_TRUST = [
  "Không spam",
  "Chỉ dùng để tư vấn nguồn hàng",
  "Phản hồi trong giờ làm việc",
];

export default function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function validate(): string | null {
    if (!name.trim()) return "Vui lòng nhập họ tên.";
    if (!phone.trim()) return "Vui lòng nhập số điện thoại.";
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
      <div className="lead-form-success">
        <div className="lead-form-success-icon" aria-hidden>
          ✓
        </div>
        <h2 className="lead-form-success-title">ATTD đã nhận yêu cầu</h2>
        <p className="lead-form-success-text">
          Cảm ơn bạn. Đội ngũ ATTD sẽ xem thông tin và phản hồi trong giờ làm việc.
        </p>
      </div>
    );
  }

  return (
    <form className="lead-form public-lead-form public-lead-form--contact" onSubmit={handleSubmit} noValidate>
      <div className="public-lead-form__header">
        <p className="public-lead-form__eyebrow">Yêu cầu tư vấn</p>
        <h2 className="lead-form-title">{CTA.secondary.label}</h2>
        <p className="public-lead-form__description">
          Chỉ cần để lại thông tin liên hệ và nhu cầu chính. ATTD sẽ hỏi thêm chi tiết nếu cần báo giá chính xác hơn.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="name" className="form-label">
          Họ tên <span className="form-required">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="form-input"
          placeholder="Nguyễn Văn A"
          required
          autoComplete="name"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="phone" className="form-label">
            Số điện thoại <span className="form-required">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="form-input"
            placeholder="Số điện thoại/Zalo"
            required
            autoComplete="tel"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="Không bắt buộc"
            autoComplete="email"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="company" className="form-label">
          Công ty
        </label>
        <input
          id="company"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="form-input"
          placeholder="Không bắt buộc"
        />
      </div>

      <div className="form-group">
        <label htmlFor="message" className="form-label">
          Nội dung yêu cầu
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Ví dụ: Báo giá áo thun trơn 500 cái, nhiều màu và size. Cần giao trong 2 tuần..."
          className="form-input form-textarea"
        />
        <div className="form-hint">
          Gợi ý: sản phẩm, số lượng, logo/in thêu, thời gian cần hàng.
        </div>
      </div>

      {formStatus === "error" && (
        <div className="form-error" role="alert">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        className="btn-primary lead-form-submit"
        disabled={formStatus === "loading"}
      >
        {formStatus === "loading" ? "Đang gửi yêu cầu..." : "Gửi yêu cầu báo giá"}
      </button>

      <B2BTrustSignals
        items={CONTACT_FORM_TRUST}
        variant="inline"
        ariaLabel="Cam kết khi gửi thông tin"
        className="public-lead-form__reassurance"
      />
    </form>
  );
}

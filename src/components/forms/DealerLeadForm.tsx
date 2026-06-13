"use client";

import { useState } from "react";
import { trackGenerateLead } from "@/lib/analytics";
import { getAttribution } from "@/lib/attribution";
import { CTA } from "@/lib/ctaConfig";

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

type FormStatus = "idle" | "loading" | "success" | "error";

interface DealerLeadFormProps {
  source: string;
  title?: string;
  submitLabel?: string;
}

export default function DealerLeadForm({
  source,
  title = CTA.secondary.label,
  submitLabel = CTA.secondary.label,
}: DealerLeadFormProps) {
  const [contactName, setContactName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

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
      <div className="lead-form-success">
        <div className="lead-form-success-icon" aria-hidden>
          ✓
        </div>
        <h2 className="lead-form-success-title">Đã gửi thành công!</h2>
        <p className="lead-form-success-text">
          Cảm ơn bạn. ATTD sẽ liên hệ trong thời gian sớm nhất.
        </p>
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={handleSubmit} noValidate>
      <h2 className="lead-form-title">{title}</h2>

      <div className="form-group">
        <label htmlFor={`companyName-${source}`} className="form-label">
          Tên công ty / thương hiệu
        </label>
        <input
          id={`companyName-${source}`}
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Không bắt buộc"
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor={`contactName-${source}`} className="form-label">
          Họ tên người liên hệ <span className="form-required">*</span>
        </label>
        <input
          id={`contactName-${source}`}
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className="form-input"
          required
          autoComplete="name"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor={`phone-${source}`} className="form-label">
            Số điện thoại <span className="form-required">*</span>
          </label>
          <input
            id={`phone-${source}`}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="form-input"
            required
            autoComplete="tel"
          />
        </div>
        <div className="form-group">
          <label htmlFor={`email-${source}`} className="form-label">
            Email
          </label>
          <input
            id={`email-${source}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Không bắt buộc"
            className="form-input"
            autoComplete="email"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor={`city-${source}`} className="form-label">
          Tỉnh / Thành phố
        </label>
        <select
          id={`city-${source}`}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={`form-input form-select${city ? "" : " form-select--placeholder"}`}
        >
          <option value="">Chọn tỉnh thành</option>
          {PROVINCES.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor={`message-${source}`} className="form-label">
          Nhu cầu / Tin nhắn
        </label>
        <textarea
          id={`message-${source}`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Ví dụ: Cần báo giá áo thun trơn số lượng lớn, hỏi về OEM Private Label..."
          className="form-input form-textarea"
        />
        <div className="form-hint">{message.length} / 2000</div>
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
        {formStatus === "loading" ? "Đang gửi..." : submitLabel}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import TrustReassuranceLine from "@/components/public/trust/TrustReassuranceLine";
import { ButtonLoading } from "@/components/ui/loading/ContextLoading";
import { trackDealerFormSubmitAttempt, trackGenerateLead } from "@/lib/analytics";
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
  description?: string;
  reassuranceItems?: string[];
  reassuranceText?: string;
}

export default function DealerLeadForm({
  source,
  title = CTA.secondary.label,
  submitLabel = CTA.secondary.label,
  description,
  reassuranceItems,
  reassuranceText,
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
    trackDealerFormSubmitAttempt(source);

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
        <h2 className="lead-form-success-title">ATTD đã nhận thông tin</h2>
        <p className="lead-form-success-text">
          Cảm ơn bạn. Đội ngũ ATTD sẽ xem nhu cầu và liên hệ lại trong giờ làm việc.
        </p>
      </div>
    );
  }

  return (
    <form className="lead-form public-lead-form" onSubmit={handleSubmit} noValidate>
      <div className="public-lead-form__header">
        <p className="public-lead-form__eyebrow">Thông tin liên hệ</p>
        <h2 className="lead-form-title">{title}</h2>
        {description && (
          <p className="public-lead-form__description">{description}</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor={`companyName-${source}`} className="form-label">
          Tên công ty / thương hiệu
        </label>
        <input
          id={`companyName-${source}`}
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Ví dụ: ATTD Agency"
          className="form-input"
          autoComplete="organization"
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
          placeholder="Người phụ trách"
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
            placeholder="Số điện thoại/Zalo"
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
          placeholder="Ví dụ: Cần nguồn áo thun/polo cho khách doanh nghiệp, muốn hỏi giá đại lý hoặc OEM..."
          className="form-input form-textarea"
        />
        <div className="form-hint">
          Gợi ý: nhóm sản phẩm, số lượng thường đặt, khu vực, mô hình kinh doanh. {message.length} / 2000
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
        aria-busy={formStatus === "loading" || undefined}
      >
        {formStatus === "loading" ? (
          <ButtonLoading title="Đang gửi thông tin..." tone="public" />
        ) : (
          submitLabel
        )}
      </button>

      {reassuranceText ? (
        <TrustReassuranceLine className="public-lead-form__reassurance">
          {reassuranceText}
        </TrustReassuranceLine>
      ) : reassuranceItems && reassuranceItems.length > 0 ? (
        <ul className="public-lead-form__reassurance" aria-label="Cam kết khi gửi thông tin">
          {reassuranceItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}

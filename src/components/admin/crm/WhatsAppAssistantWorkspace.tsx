"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EMPTY_WHATSAPP_EXTRACTED,
  WHATSAPP_EXTRACTED_LABELS,
  WHATSAPP_ASSISTANT_MAX_CHAT_LENGTH,
  type WhatsAppAssistantAnalysis,
  type WhatsAppAssistantExtracted,
} from "@/features/crm/whatsapp-assistant/types";

const EXTRACTED_FIELDS = Object.keys(EMPTY_WHATSAPP_EXTRACTED) as Array<keyof WhatsAppAssistantExtracted>;

const QUALITY_LABELS: Record<WhatsAppAssistantAnalysis["leadQuality"], string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
};

type ApiError = {
  message?: string;
};

async function readApiJson<T>(res: Response): Promise<T> {
  const data = await res.json() as T & ApiError;
  if (!res.ok) {
    throw new Error(data.message || "Có lỗi xảy ra. Vui lòng thử lại.");
  }
  return data;
}

function normalizeEditableAnalysis(analysis: WhatsAppAssistantAnalysis): WhatsAppAssistantAnalysis {
  return {
    ...analysis,
    extracted: {
      ...EMPTY_WHATSAPP_EXTRACTED,
      ...analysis.extracted,
    },
  };
}

export default function WhatsAppAssistantWorkspace() {
  const router = useRouter();
  const [rawChatText, setRawChatText] = useState("");
  const [sourceWebsite, setSourceWebsite] = useState("Vietnamclothing.vn");
  const [customerName, setCustomerName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [analysis, setAnalysis] = useState<WhatsAppAssistantAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leadMessage, setLeadMessage] = useState<string | null>(null);

  const remainingCharacters = useMemo(
    () => WHATSAPP_ASSISTANT_MAX_CHAT_LENGTH - rawChatText.length,
    [rawChatText.length]
  );

  function updateExtractedField(key: keyof WhatsAppAssistantExtracted, value: string) {
    setAnalysis((current) => {
      if (!current) return current;
      return {
        ...current,
        extracted: {
          ...current.extracted,
          [key]: value,
        },
      };
    });
  }

  async function handleAnalyze(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLeadMessage(null);

    if (!rawChatText.trim()) {
      setError("Vui lòng dán nội dung chat WhatsApp.");
      return;
    }

    if (rawChatText.length > WHATSAPP_ASSISTANT_MAX_CHAT_LENGTH) {
      setError(`Nội dung chat quá dài. Vui lòng rút gọn dưới ${WHATSAPP_ASSISTANT_MAX_CHAT_LENGTH} ký tự.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/crm/whatsapp-assistant/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawChatText,
          sourceWebsite,
          customerName,
          company,
          email,
          phone,
        }),
      });
      const data = await readApiJson<WhatsAppAssistantAnalysis>(res);
      setAnalysis(normalizeEditableAnalysis(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể phân tích nội dung chat.");
    } finally {
      setLoading(false);
    }
  }

  async function copyReply(message: string, index: number) {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 1800);
    } catch {
      setError("Không copy được nội dung. Vui lòng sao chép thủ công.");
    }
  }

  async function createLead() {
    if (!analysis) {
      setError("Vui lòng phân tích AI trước khi tạo Lead CRM.");
      return;
    }

    setCreatingLead(true);
    setError(null);
    setLeadMessage(null);
    try {
      const res = await fetch("/api/crm/whatsapp-assistant/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawChatText,
          sourceWebsite,
          customerName,
          company,
          email,
          phone,
          analysis,
        }),
      });
      const data = await readApiJson<{ lead: { id: string; code: string | null } }>(res);
      setLeadMessage(`Đã tạo Lead CRM ${data.lead.code || ""}.`);
      router.push(`/admin/crm/leads/${data.lead.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo Lead CRM.");
    } finally {
      setCreatingLead(false);
    }
  }

  return (
    <div className="admin-form admin-form--wide">
      <form onSubmit={handleAnalyze}>
        <section className="admin-section-card">
          <div className="admin-section-header">
            <h2>Nội dung WhatsApp</h2>
            <span className={remainingCharacters < 0 ? "admin-status-badge admin-status-badge--danger" : "admin-empty-hint"}>
              Còn {remainingCharacters} ký tự
            </span>
          </div>
          <label>
            Dán nội dung chat WhatsApp
            <textarea
              className="admin-input"
              rows={12}
              value={rawChatText}
              onChange={(event) => setRawChatText(event.target.value)}
              placeholder="Dán toàn bộ đoạn chat với khách quốc tế từ WhatsApp..."
              required
            />
          </label>
        </section>

        <section className="admin-section-card">
          <h2>Thông tin bổ sung</h2>
          <div className="admin-form-grid">
            <label>
              Source website
              <input className="admin-input" value={sourceWebsite} onChange={(event) => setSourceWebsite(event.target.value)} />
            </label>
            <label>
              Customer name
              <input className="admin-input" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
            </label>
            <label>
              Company
              <input className="admin-input" value={company} onChange={(event) => setCompany(event.target.value)} />
            </label>
            <label>
              Email
              <input type="email" className="admin-input" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              WhatsApp / Phone
              <input className="admin-input" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
          </div>
        </section>

        {error && <p className="admin-message admin-message--error">{error}</p>}
        {leadMessage && <p className="admin-message admin-message--success">{leadMessage}</p>}

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn admin-btn--primary" disabled={loading}>
            {loading ? "Đang phân tích..." : "Phân tích bằng AI"}
          </button>
        </div>
      </form>

      {analysis && (
        <div className="admin-form admin-form--wide">
          {analysis.adminWarningVi && (
            <p className="admin-message admin-message--warning">{analysis.adminWarningVi}</p>
          )}

          <section className="admin-section-card">
            <div className="admin-section-header">
              <h2>Tóm tắt nhu cầu</h2>
              <span className="admin-status-badge">Lead: {QUALITY_LABELS[analysis.leadQuality]}</span>
            </div>
            <p>{analysis.summaryVi}</p>
            <p className="admin-empty-hint">Ngôn ngữ phát hiện: {analysis.detectedLanguage || "Chưa rõ"}</p>
          </section>

          <section className="admin-section-card">
            <h2>Thông tin trích xuất</h2>
            <div className="admin-form-grid">
              {EXTRACTED_FIELDS.map((field) => (
                <label key={field}>
                  {WHATSAPP_EXTRACTED_LABELS[field]}
                  <input
                    className="admin-input"
                    value={analysis.extracted[field]}
                    onChange={(event) => updateExtractedField(field, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="admin-section-card">
            <h2>Thông tin còn thiếu</h2>
            {analysis.missingInfo.length > 0 ? (
              <ul className="admin-checklist">
                {analysis.missingInfo.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="admin-empty-hint">AI chưa phát hiện thông tin còn thiếu nổi bật.</p>
            )}
          </section>

          <section className="admin-section-card">
            <h2>Gợi ý bước tiếp theo</h2>
            <p>{analysis.suggestedNextActionVi}</p>
            {analysis.internalNotesVi && <p className="admin-empty-hint">{analysis.internalNotesVi}</p>}
          </section>

          <section className="admin-section-card">
            <div className="admin-section-header">
              <h2>Gợi ý trả lời khách</h2>
              <span className="admin-empty-hint">Nội dung gửi khách bằng tiếng Anh</span>
            </div>
            <div className="admin-crm-interest-rows">
              {analysis.replyOptions.map((option, index) => (
                <div key={`${option.label}-${index}`} className="admin-crm-interest-row">
                  <div className="admin-section-header">
                    <strong>{option.label}</strong>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--sm"
                      onClick={() => void copyReply(option.message, index)}
                    >
                      {copiedIndex === index ? "Đã copy" : "Copy"}
                    </button>
                  </div>
                  <textarea
                    className="admin-input"
                    rows={5}
                    value={option.message}
                    onChange={(event) => {
                      const value = event.target.value;
                      setAnalysis((current) => {
                        if (!current) return current;
                        return {
                          ...current,
                          replyOptions: current.replyOptions.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, message: value } : item
                          ),
                        };
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          <div className="admin-form-actions">
            <button type="button" className="admin-btn admin-btn--primary" disabled={creatingLead} onClick={() => void createLead()}>
              {creatingLead ? "Đang tạo Lead..." : "Tạo Lead CRM"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { LeadPipelineStatus } from "@prisma/client";
import {
  PIPELINE_STATUS_LABELS,
  PIPELINE_STATUS_COLORS,
  ALL_PIPELINE_STATUSES,
} from "@/lib/pipelineStatus";

/** Serialised form passed from the server component. */
export interface SerializedLead {
  id: string;
  contactName: string;
  companyName: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  source: string;
  message: string | null;
  pipelineStatus: LeadPipelineStatus;
  assignedTo: string | null;
  estimatedValue: string | null;
  contactedAt: string | null;
  wonAt: string | null;
  lostAt: string | null;
  salesNote: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  referrer: string | null;
  landingPage: string | null;
  createdAt: string;
}


const SOURCE_LABELS: Record<string, string> = {
  DEALER_FORM: "Đăng ký đại lý",
  OEM_PAGE: "Trang OEM",
  WHOLESALE_PAGE: "Nguồn hàng sỉ",
  CORPORATE_GIFTS_PAGE: "Quà tặng DN",
  WEBSITE: "Website",
};

function formatIso(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        gap: "4px 12px",
        padding: "6px 0",
        borderBottom: "1px solid #f3f4f6",
        fontSize: "14px",
        alignItems: "start",
      }}
    >
      <span style={{ color: "#9ca3af", fontWeight: 500, whiteSpace: "nowrap" }}>
        {label}
      </span>
      <span style={{ color: "#111827", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: "12px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "#6b7280",
        margin: "24px 0 8px",
      }}
    >
      {children}
    </h3>
  );
}

interface Props {
  lead: SerializedLead;
}

export default function LeadCRMDrawer({ lead }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  // Editable CRM state
  const [pipelineStatus, setPipelineStatus] = useState<LeadPipelineStatus>(
    lead.pipelineStatus
  );
  const [assignedTo, setAssignedTo] = useState(lead.assignedTo ?? "");
  const [estimatedValue, setEstimatedValue] = useState(
    lead.estimatedValue ?? ""
  );
  const [salesNote, setSalesNote] = useState(lead.salesNote ?? "");

  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Reflected timestamps (updated after save)
  const [contactedAt, setContactedAt] = useState(lead.contactedAt);
  const [wonAt, setWonAt] = useState(lead.wonAt);
  const [lostAt, setLostAt] = useState(lead.lostAt);

  async function handleSave(): Promise<void> {
    setSaving(true);
    setSavedOk(false);
    setSaveError("");

    try {
      const res = await fetch(`/api/dealer-leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pipelineStatus,
          assignedTo: assignedTo.trim() || null,
          estimatedValue: estimatedValue !== "" ? Number(estimatedValue) : null,
          salesNote: salesNote.trim() || null,
        }),
      });

      const data: unknown = await res.json();

      if (res.ok && (data as { success?: boolean }).success) {
        setSavedOk(true);
        // Update reflected timestamps from response
        const updated = (data as { lead?: Record<string, unknown> }).lead;
        if (updated) {
          setContactedAt((updated.contactedAt as string | null) ?? null);
          setWonAt((updated.wonAt as string | null) ?? null);
          setLostAt((updated.lostAt as string | null) ?? null);
        }
        setTimeout(() => setSavedOk(false), 3000);
      } else {
        setSaveError(
          (data as { message?: string }).message ?? "Đã có lỗi xảy ra."
        );
      }
    } catch {
      setSaveError("Không kết nối được server.");
    } finally {
      setSaving(false);
    }
  }

  const { bg: badgeBg, color: badgeColor } =
    PIPELINE_STATUS_COLORS[pipelineStatus];

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          fontSize: "13px",
          color: "#1d4ed8",
          background: "none",
          border: "1px solid #bfdbfe",
          borderRadius: "6px",
          padding: "4px 10px",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Chi tiết →
      </button>

      {/* Overlay + Drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              zIndex: 999,
            }}
          />

          {/* Drawer panel */}
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "min(540px, 100vw)",
              height: "100%",
              background: "#ffffff",
              zIndex: 1000,
              overflowY: "auto",
              boxShadow: "-6px 0 32px rgba(0,0,0,0.14)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Drawer header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f9fafb",
                flexShrink: 0,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#111827",
                    margin: "0 0 2px",
                  }}
                >
                  {lead.contactName}
                </h2>
                <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                  {lead.companyName ?? "Cá nhân"} · {lead.phone}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Đóng"
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#6b7280",
                  lineHeight: 1,
                  padding: "4px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Drawer body */}
            <div style={{ padding: "0 24px 32px", flex: 1 }}>
              {/* ── Customer information ── */}
              <SectionTitle>Thông tin khách hàng</SectionTitle>
              <InfoRow label="Họ tên" value={lead.contactName} />
              <InfoRow
                label="Điện thoại"
                value={
                  <a
                    href={`tel:${lead.phone}`}
                    style={{ color: "#1d4ed8", textDecoration: "none" }}
                  >
                    {lead.phone}
                  </a>
                }
              />
              <InfoRow label="Email" value={lead.email ?? "—"} />
              <InfoRow label="Công ty" value={lead.companyName ?? "—"} />
              <InfoRow label="Tỉnh thành" value={lead.city ?? "—"} />
              <InfoRow
                label="Nguồn form"
                value={SOURCE_LABELS[lead.source] ?? lead.source}
              />
              {lead.message && (
                <InfoRow
                  label="Tin nhắn"
                  value={
                    <span
                      style={{
                        whiteSpace: "pre-wrap",
                        fontSize: "13px",
                        lineHeight: 1.6,
                      }}
                    >
                      {lead.message}
                    </span>
                  }
                />
              )}
              <InfoRow label="Ngày tạo" value={formatIso(lead.createdAt)} />

              {/* ── Attribution ── */}
              {(lead.utmSource ||
                lead.utmMedium ||
                lead.utmCampaign ||
                lead.utmTerm ||
                lead.utmContent ||
                lead.referrer ||
                lead.landingPage) && (
                <>
                  <SectionTitle>Nguồn liên hệ</SectionTitle>
                  {lead.utmSource && (
                    <InfoRow label="UTM Source" value={lead.utmSource} />
                  )}
                  {lead.utmMedium && (
                    <InfoRow label="UTM Medium" value={lead.utmMedium} />
                  )}
                  {lead.utmCampaign && (
                    <InfoRow label="Chiến dịch" value={lead.utmCampaign} />
                  )}
                  {lead.utmTerm && (
                    <InfoRow label="UTM Term" value={lead.utmTerm} />
                  )}
                  {lead.utmContent && (
                    <InfoRow label="UTM Content" value={lead.utmContent} />
                  )}
                  {lead.referrer && (
                    <InfoRow label="Referrer" value={lead.referrer} />
                  )}
                  {lead.landingPage && (
                    <InfoRow label="Trang đầu" value={lead.landingPage} />
                  )}
                </>
              )}

              {/* ── CRM information ── */}
              <SectionTitle>CRM</SectionTitle>

              {/* Read-only timestamps */}
              {contactedAt && (
                <InfoRow
                  label="Đã liên hệ lúc"
                  value={formatIso(contactedAt)}
                />
              )}
              {wonAt && (
                <InfoRow label="Đã chốt lúc" value={formatIso(wonAt)} />
              )}
              {lostAt && (
                <InfoRow label="Thất bại lúc" value={formatIso(lostAt)} />
              )}

              {/* Editable: Pipeline Status */}
              <div style={{ marginTop: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Trạng thái pipeline
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      padding: "3px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 700,
                      background: badgeBg,
                      color: badgeColor,
                    }}
                  >
                    {PIPELINE_STATUS_LABELS[pipelineStatus]}
                  </span>
                  <select
                    value={pipelineStatus}
                    onChange={(e) =>
                      setPipelineStatus(e.target.value as LeadPipelineStatus)
                    }
                    style={{
                      fontSize: "13px",
                      padding: "6px 10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {ALL_PIPELINE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {PIPELINE_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Editable: Assigned To */}
              <div style={{ marginTop: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Phụ trách
                </label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Tên nhân viên phụ trách"
                  maxLength={255}
                  style={{
                    width: "100%",
                    fontSize: "14px",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Editable: Estimated Value */}
              <div style={{ marginTop: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Giá trị ước tính (VNĐ)
                </label>
                <input
                  type="number"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="100000"
                  style={{
                    width: "100%",
                    fontSize: "14px",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Editable: Sales Note */}
              <div style={{ marginTop: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Ghi chú bán hàng
                </label>
                <textarea
                  value={salesNote}
                  onChange={(e) => setSalesNote(e.target.value)}
                  placeholder="Ghi chú nội bộ…"
                  rows={4}
                  maxLength={4000}
                  style={{
                    width: "100%",
                    fontSize: "14px",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    lineHeight: 1.6,
                  }}
                />
                <p
                  style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    margin: "4px 0 0",
                    textAlign: "right",
                  }}
                >
                  {salesNote.length}/4000
                </p>
              </div>

              {/* Save */}
              <div style={{ marginTop: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: "10px 24px",
                    background: saving ? "#9ca3af" : "#1d4ed8",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Đang lưu…" : "Lưu CRM"}
                </button>

                {savedOk && (
                  <span style={{ fontSize: "13px", color: "#166534" }}>
                    ✓ Đã lưu
                  </span>
                )}
                {saveError && (
                  <span style={{ fontSize: "13px", color: "#dc2626" }}>
                    {saveError}
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

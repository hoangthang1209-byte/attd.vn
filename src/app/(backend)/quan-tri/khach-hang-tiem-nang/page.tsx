import { prisma } from "@/lib/prisma";
import Link from "next/link";
import PipelineStatusSelector from "@/components/admin/PipelineStatusSelector";
import LeadCRMDrawer, {
  type SerializedLead,
} from "@/components/admin/LeadCRMDrawer";
import {
  PIPELINE_STATUS_COLORS,
  PIPELINE_STATUS_LABELS,
} from "@/lib/pipelineStatus";
import type { LeadPipelineStatus } from "@prisma/client";

const SOURCE_LABELS: Record<string, string> = {
  DEALER_FORM: "Đăng ký đại lý",
  OEM_PAGE: "Trang OEM",
  WHOLESALE_PAGE: "Nguồn hàng sỉ",
  CORPORATE_GIFTS_PAGE: "Quà tặng DN",
  WEBSITE: "Website",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/** Formats utm_source / utm_medium as an acquisition label. */
function acquisitionLabel(lead: SerializedLead): string {
  if (lead.utmSource) {
    return lead.utmMedium
      ? `${lead.utmSource} / ${lead.utmMedium}`
      : lead.utmSource;
  }
  if (lead.referrer) return "referral";
  return "direct";
}

function formatCurrency(value: string | null): string {
  if (!value) return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(num);
}

const DASH = <span style={{ color: "#d1d5db" }}>—</span>;

const headers = [
  "Ngày tạo",
  "Họ tên",
  "Công ty",
  "Điện thoại",
  "Tỉnh thành",
  "Kênh",
  "UTM Nguồn",
  "Chiến dịch",
  "Trang đầu",
  "Chi tiết",
  "Pipeline",
  "Phụ trách",
  "Giá trị",
];

export default async function KhachHangTiemNangPage() {
  const rawLeads = await prisma.dealerLead.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Serialize: convert non-JSON-safe types (Date, Decimal) to plain strings
  const leads: SerializedLead[] = rawLeads.map((lead) => ({
    id: lead.id,
    contactName: lead.contactName,
    companyName: lead.companyName,
    phone: lead.phone,
    email: lead.email,
    city: lead.city,
    source: lead.source,
    message: lead.message,
    pipelineStatus: lead.pipelineStatus,
    assignedTo: lead.assignedTo,
    estimatedValue: lead.estimatedValue?.toString() ?? null,
    contactedAt: lead.contactedAt?.toISOString() ?? null,
    wonAt: lead.wonAt?.toISOString() ?? null,
    lostAt: lead.lostAt?.toISOString() ?? null,
    salesNote: lead.salesNote,
    utmSource: lead.utmSource,
    utmMedium: lead.utmMedium,
    utmCampaign: lead.utmCampaign,
    utmTerm: lead.utmTerm,
    utmContent: lead.utmContent,
    referrer: lead.referrer,
    landingPage: lead.landingPage,
    createdAt: lead.createdAt.toISOString(),
  }));

  const newCount = leads.filter((l) => l.pipelineStatus === "NEW").length;
  const wonCount = leads.filter((l) => l.pipelineStatus === "WON").length;

  return (
    <div style={{ padding: "32px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#111827",
              margin: "0 0 6px",
            }}
          >
            Khách hàng tiềm năng
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
            {leads.length} liên hệ tổng —{" "}
            <strong style={{ color: "#1d4ed8" }}>{newCount} mới</strong>
            {wonCount > 0 && (
              <>
                {" "}—{" "}
                <strong style={{ color: "#166534" }}>{wonCount} đã chốt</strong>
              </>
            )}
          </p>
        </div>

        <Link
          href="/quan-tri"
          style={{ fontSize: "14px", color: "#6b7280", textDecoration: "none" }}
        >
          ← Dashboard
        </Link>
      </div>

      {/* Pipeline summary badges */}
      {leads.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          {(
            [
              "NEW",
              "CONTACTED",
              "QUOTED",
              "NEGOTIATING",
              "WON",
              "LOST",
            ] as const
          ).map((status) => {
            const count = leads.filter(
              (l) => l.pipelineStatus === status
            ).length;
            if (count === 0) return null;
            const { bg, color } = PIPELINE_STATUS_COLORS[status];
            return (
              <span
                key={status}
                style={{
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: bg,
                  color,
                }}
              >
                {PIPELINE_STATUS_LABELS[status]}: {count}
              </span>
            );
          })}
        </div>
      )}

      {leads.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "64px 32px",
            background: "#f9fafb",
            borderRadius: "12px",
            color: "#9ca3af",
            fontSize: "15px",
          }}
        >
          Chưa có liên hệ nào.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}
          >
            <thead>
              <tr
                style={{
                  background: "#f9fafb",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                {headers.map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {leads.map((lead) => {
                const isNew = lead.pipelineStatus === "NEW";
                const isWon = lead.pipelineStatus === "WON";

                return (
                  <tr
                    key={lead.id}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      background: isWon
                        ? "#f0fdf4"
                        : isNew
                        ? "#f0f9ff"
                        : "#fff",
                    }}
                  >
                    {/* Created date */}
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#6b7280",
                        whiteSpace: "nowrap",
                        fontSize: "13px",
                      }}
                    >
                      {formatDate(new Date(lead.createdAt))}
                    </td>

                    {/* Contact name */}
                    <td
                      style={{
                        padding: "14px 16px",
                        fontWeight: 600,
                        color: "#111827",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lead.contactName}
                    </td>

                    {/* Company */}
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#374151",
                        maxWidth: "160px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={lead.companyName ?? ""}
                    >
                      {lead.companyName ?? DASH}
                    </td>

                    {/* Phone */}
                    <td
                      style={{
                        padding: "14px 16px",
                        whiteSpace: "nowrap",
                        color: "#374151",
                      }}
                    >
                      <a
                        href={`tel:${lead.phone}`}
                        style={{
                          color: "#374151",
                          textDecoration: "none",
                          fontWeight: 500,
                        }}
                      >
                        {lead.phone}
                      </a>
                    </td>

                    {/* City */}
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#6b7280",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lead.city ?? DASH}
                    </td>

                    {/* Source (form page) */}
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: "#f3f4f6",
                          color: "#374151",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {SOURCE_LABELS[lead.source] ?? lead.source}
                      </span>
                    </td>

                    {/* UTM Source */}
                    <td
                      style={{
                        padding: "14px 16px",
                        whiteSpace: "nowrap",
                        fontSize: "13px",
                        color: "#374151",
                      }}
                    >
                      {lead.utmSource || lead.referrer ? (
                        <span
                          style={{
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {acquisitionLabel(lead)}
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "#f3f4f6",
                            color: "#9ca3af",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 500,
                          }}
                        >
                          direct
                        </span>
                      )}
                    </td>

                    {/* Campaign */}
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        color: "#374151",
                        maxWidth: "140px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={lead.utmCampaign ?? ""}
                    >
                      {lead.utmCampaign ?? DASH}
                    </td>

                    {/* Landing page */}
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        color: "#374151",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lead.landingPage ?? DASH}
                    </td>

                    {/* CRM detail drawer */}
                    <td style={{ padding: "14px 16px" }}>
                      <LeadCRMDrawer lead={lead} />
                    </td>

                    {/* Pipeline status selector */}
                    <td style={{ padding: "14px 16px" }}>
                      <PipelineStatusSelector
                        leadId={lead.id}
                        initialStatus={lead.pipelineStatus}
                      />
                    </td>

                    {/* Assigned to */}
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        color: "#374151",
                        maxWidth: "120px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={lead.assignedTo ?? ""}
                    >
                      {lead.assignedTo ?? DASH}
                    </td>

                    {/* Estimated value */}
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        color: "#374151",
                        whiteSpace: "nowrap",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {lead.estimatedValue
                        ? formatCurrency(lead.estimatedValue)
                        : DASH}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

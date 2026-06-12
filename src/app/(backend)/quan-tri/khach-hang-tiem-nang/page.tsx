import { prisma } from "@/lib/prisma";
import type { DealerLead, DealerLeadStatus } from "@prisma/client";
import DealerLeadStatusSelector from "@/components/admin/DealerLeadStatusSelector";
import Link from "next/link";

const STATUS_LABELS: Record<DealerLeadStatus, string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  QUALIFIED: "Tiềm năng",
  CLOSED: "Đã đóng",
};

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

export default async function KhachHangTiemNangPage() {
  const leads = await prisma.dealerLead.findMany({
    orderBy: { createdAt: "desc" },
  });

  const newCount = leads.filter((l) => l.status === "NEW").length;

  return (
    <div style={{ padding: "32px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "32px",
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
          </p>
        </div>

        <Link
          href="/quan-tri"
          style={{
            fontSize: "14px",
            color: "#6b7280",
            textDecoration: "none",
          }}
        >
          ← Dashboard
        </Link>
      </div>

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
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f9fafb",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                {[
                  "Ngày tạo",
                  "Họ tên",
                  "Công ty",
                  "Điện thoại",
                  "Tỉnh thành",
                  "Nguồn",
                  "Nội dung",
                  "Trạng thái",
                ].map((h) => (
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
              {leads.map((lead: DealerLead) => (
                <tr
                  key={lead.id}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    background: lead.status === "NEW" ? "#f0f9ff" : "#fff",
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
                    {formatDate(lead.createdAt)}
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
                    {lead.companyName ?? (
                      <span style={{ color: "#d1d5db" }}>—</span>
                    )}
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
                    {lead.city ?? <span style={{ color: "#d1d5db" }}>—</span>}
                  </td>

                  {/* Source */}
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

                  {/* Message */}
                  <td
                    style={{
                      padding: "14px 16px",
                      color: "#6b7280",
                      maxWidth: "220px",
                    }}
                  >
                    {lead.message ? (
                      <details style={{ cursor: "pointer" }}>
                        <summary
                          style={{
                            fontSize: "13px",
                            color: "#374151",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "200px",
                            listStyle: "none",
                            display: "block",
                          }}
                        >
                          {lead.message.slice(0, 60)}
                          {lead.message.length > 60 ? "…" : ""}
                        </summary>
                        <div
                          style={{
                            marginTop: "8px",
                            fontSize: "13px",
                            lineHeight: 1.6,
                            color: "#374151",
                            whiteSpace: "pre-wrap",
                            background: "#f9fafb",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            minWidth: "240px",
                          }}
                        >
                          {lead.message}
                        </div>
                      </details>
                    ) : (
                      <span style={{ color: "#d1d5db" }}>—</span>
                    )}
                  </td>

                  {/* Status selector */}
                  <td style={{ padding: "14px 16px" }}>
                    <DealerLeadStatusSelector
                      leadId={lead.id}
                      initialStatus={lead.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

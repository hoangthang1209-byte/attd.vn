import { getLeads } from "@/features/leads/services/lead.service";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; background: string }
> = {
  NEW: { label: "Mới", color: "#2563eb", background: "#dbeafe" },
  PROCESSING: { label: "Đang xử lý", color: "#d97706", background: "#fef3c7" },
  QUOTED: { label: "Đã báo giá", color: "#7c3aed", background: "#ede9fe" },
  WON: { label: "Đã chốt", color: "#16a34a", background: "#dcfce7" },
  LOST: { label: "Đã hủy", color: "#6b7280", background: "#f3f4f6" },
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function LeadAdminPage() {
  const leads = await getLeads();

  return (
    <div style={{ padding: "32px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "24px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>
          Quản lý Lead
        </h1>
        <span style={{ fontSize: "14px", color: "#6b7280" }}>
          {leads.length} yêu cầu
        </span>
      </div>

      {leads.length === 0 ? (
        <div
          style={{
            padding: "64px 32px",
            textAlign: "center",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            color: "#6b7280",
          }}
        >
          Chưa có yêu cầu nào.
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
                  borderBottom: "2px solid #e5e7eb",
                }}
              >
                {[
                  "Họ tên",
                  "Công ty",
                  "SĐT",
                  "Email",
                  "Nội dung",
                  "Trạng thái",
                  "Ngày tạo",
                ].map((header) => (
                  <th
                    key={header}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#374151",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {leads.map((lead, index) => {
                const statusConfig =
                  STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.NEW;

                return (
                  <tr
                    key={lead.id}
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      background: index % 2 === 0 ? "#fff" : "#fafafa",
                    }}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                      {lead.name}
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      {lead.company ?? "—"}
                    </td>

                    <td
                      style={{ padding: "12px 16px", whiteSpace: "nowrap" }}
                    >
                      {lead.phone}
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      {lead.email ?? "—"}
                    </td>

                    <td
                      style={{
                        padding: "12px 16px",
                        maxWidth: "220px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={lead.message ?? ""}
                    >
                      {lead.message ?? "—"}
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: statusConfig.color,
                          background: statusConfig.background,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {statusConfig.label}
                      </span>
                    </td>

                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#6b7280",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(lead.createdAt)}
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

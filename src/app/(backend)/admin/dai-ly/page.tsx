import { getDealers } from "@/features/dealers/services/dealer.service";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; background: string }
> = {
  PENDING: { label: "Chờ duyệt", color: "#d97706", background: "#fef3c7" },
  APPROVED: { label: "Đã duyệt", color: "#16a34a", background: "#dcfce7" },
  REJECTED: { label: "Từ chối", color: "#dc2626", background: "#fee2e2" },
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function DaiLyAdminPage() {
  const dealers = await getDealers();

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
          Quản lý đại lý
        </h1>
        <span style={{ fontSize: "14px", color: "#6b7280" }}>
          {dealers.length} đăng ký
        </span>
      </div>

      {dealers.length === 0 ? (
        <div
          style={{
            padding: "64px 32px",
            textAlign: "center",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            color: "#6b7280",
          }}
        >
          Chưa có đại lý nào đăng ký.
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
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                {["Họ tên", "Công ty", "SĐT", "Email", "Tỉnh thành", "Nhu cầu", "Trạng thái", "Ngày đăng ký"].map(
                  (header) => (
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
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {dealers.map((dealer, index) => {
                const statusConfig =
                  STATUS_CONFIG[dealer.status] ?? STATUS_CONFIG.PENDING;

                return (
                  <tr
                    key={dealer.id}
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      background: index % 2 === 0 ? "#fff" : "#fafafa",
                    }}
                  >
                    {/* Họ tên — stored in website field */}
                    <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                      {dealer.website ?? "—"}
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      {dealer.companyName}
                    </td>

                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      {dealer.phone}
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      {dealer.email}
                    </td>

                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      {dealer.city ?? "—"}
                    </td>

                    {/* Nhu cầu — stored in facebook field */}
                    <td
                      style={{
                        padding: "12px 16px",
                        maxWidth: "200px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={dealer.facebook ?? ""}
                    >
                      {dealer.facebook ?? "—"}
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
                      {formatDate(dealer.createdAt)}
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

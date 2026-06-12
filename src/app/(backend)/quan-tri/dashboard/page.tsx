import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { LeadPipelineStatus } from "@prisma/client";
import {
  PIPELINE_STATUS_LABELS as PIPELINE_LABELS,
  PIPELINE_STATUS_COLORS as PIPELINE_COLORS,
  ALL_PIPELINE_STATUSES,
} from "@/lib/pipelineStatus";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

export default async function DashboardPage() {
  const [
    totalLeads,
    newLeads,
    totalProducts,
    totalPosts,
    totalDealers,
    pipelineGroups,
  ] = await Promise.all([
    prisma.dealerLead.count(),
    prisma.dealerLead.count({ where: { pipelineStatus: "NEW" } }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.post.count({ where: { status: "PUBLISHED" } }),
    prisma.dealer.count(),
    prisma.dealerLead.groupBy({
      by: ["pipelineStatus"],
      _count: { id: true },
    }),
  ]);

  const pipelineCounts: Partial<Record<LeadPipelineStatus, number>> = {};
  for (const row of pipelineGroups) {
    pipelineCounts[row.pipelineStatus] = row._count.id;
  }

  const cards = [
    {
      label: "Khách hàng tiềm năng",
      value: totalLeads,
      badge: newLeads > 0 ? `${newLeads} mới` : null,
      badgeColor: "#1d4ed8",
      badgeBg: "#dbeafe",
      href: "/quan-tri/khach-hang-tiem-nang",
    },
    {
      label: "Sản phẩm đang bán",
      value: totalProducts,
      badge: null,
      badgeColor: "",
      badgeBg: "",
      href: "/quan-tri/san-pham",
    },
    {
      label: "Bài viết đã xuất bản",
      value: totalPosts,
      badge: null,
      badgeColor: "",
      badgeBg: "",
      href: "/quan-tri/bai-viet",
    },
    {
      label: "Đại lý đăng ký",
      value: totalDealers,
      badge: null,
      badgeColor: "",
      badgeBg: "",
      href: "/quan-tri/dai-ly",
    },
  ];

  const navLinks = [
    { href: "/quan-tri/san-pham", label: "Sản phẩm" },
    { href: "/quan-tri/danh-muc", label: "Danh mục" },
    { href: "/quan-tri/bai-viet", label: "Bài viết" },
    { href: "/quan-tri/khach-hang-tiem-nang", label: "Khách hàng tiềm năng" },
    { href: "/quan-tri/dai-ly", label: "Đại lý" },
    { href: "/quan-tri/lead", label: "Lead liên hệ" },
    { href: "/quan-tri/variant", label: "Variants" },
  ];

  const gaConfigured = !!GA_ID;

  return (
    <div style={{ padding: "32px" }}>
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: "#111827",
          margin: "0 0 32px",
        }}
      >
        Dashboard
      </h1>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "20px",
          marginBottom: "40px",
        }}
      >
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            style={{
              textDecoration: "none",
              display: "block",
              padding: "24px",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              background: "#fff",
              transition: "border-color 0.15s",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  fontWeight: 500,
                }}
              >
                {card.label}
              </span>
              {card.badge && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "20px",
                    background: card.badgeBg,
                    color: card.badgeColor,
                    whiteSpace: "nowrap",
                  }}
                >
                  {card.badge}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: "36px",
                fontWeight: 800,
                color: "#111827",
                lineHeight: 1,
              }}
            >
              {card.value}
            </div>
          </Link>
        ))}
      </div>

      {/* CRM Pipeline summary */}
      <div style={{ marginBottom: "40px" }}>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#374151",
            margin: "0 0 16px",
          }}
        >
          Pipeline CRM
        </h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {ALL_PIPELINE_STATUSES.map((status) => {
            const count = pipelineCounts[status] ?? 0;
            const { bg, color } = PIPELINE_COLORS[status];
            return (
              <Link
                key={status}
                href="/quan-tri/khach-hang-tiem-nang"
                style={{
                  textDecoration: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  background: bg,
                  minWidth: "90px",
                }}
              >
                <span
                  style={{ fontSize: "24px", fontWeight: 800, color, lineHeight: 1 }}
                >
                  {count}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color,
                    marginTop: "4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {PIPELINE_LABELS[status]}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Analytics card */}
      <div style={{ marginBottom: "40px" }}>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#374151",
            margin: "0 0 16px",
          }}
        >
          Analytics
        </h2>
        <div
          style={{
            padding: "24px",
            border: `1px solid ${gaConfigured ? "#bbf7d0" : "#e5e7eb"}`,
            borderRadius: "12px",
            background: gaConfigured ? "#f0fdf4" : "#f9fafb",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: gaConfigured ? "#16a34a" : "#d1d5db",
              flexShrink: 0,
            }}
          />
          <div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: gaConfigured ? "#166534" : "#6b7280",
              }}
            >
              Google Analytics 4:{" "}
              {gaConfigured ? "Đã cấu hình" : "Chưa cấu hình"}
            </div>
            <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
              {gaConfigured
                ? `Measurement ID: ${GA_ID}`
                : "Thêm NEXT_PUBLIC_GA_MEASUREMENT_ID vào .env để kích hoạt."}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#374151",
            margin: "0 0 16px",
          }}
        >
          Quản trị
        </h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: "8px 16px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#374151",
                textDecoration: "none",
                background: "#fff",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Users, Package, Factory, Truck } from "lucide-react";

const STATS = [
  {
    icon: Users,
    value: "1000+",
    label: "khách hàng",
    description: "Đại lý, xưởng in và doanh nghiệp tin tưởng",
  },
  {
    icon: Package,
    value: "Đa dạng",
    label: "nguồn hàng",
    description: "Áo thun, polo, nón, tote và quà tặng DN",
  },
  {
    icon: Factory,
    value: "OEM",
    label: "hỗ trợ",
    description: "Private label và gia công theo yêu cầu",
  },
  {
    icon: Truck,
    value: "Toàn quốc",
    label: "giao hàng",
    description: "Phục vụ đối tác B2B trên mọi miền",
  },
] as const;

export default function TrustStats() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 20,
      }}
    >
      {STATS.map(({ icon: Icon, value, label, description }) => (
        <div key={label} className="premium-card-static">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              color: "#dc2626",
            }}
          >
            <Icon size={20} strokeWidth={1.75} />
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#111827",
              lineHeight: 1.2,
              marginBottom: 4,
            }}
          >
            {value}
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#111827",
              marginBottom: 8,
              textTransform: "capitalize",
            }}
          >
            {label}
          </div>
          <p style={{ margin: 0, fontSize: "14px", color: "#6b7280", lineHeight: 1.6 }}>
            {description}
          </p>
        </div>
      ))}
    </div>
  );
}

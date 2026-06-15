import type { KnowledgeBaseKpis } from "@/features/knowledge-base/knowledge-base-types";

type Props = { kpis: KnowledgeBaseKpis };

export default function KnowledgeBaseKpisPanel({ kpis }: Props) {
  const cards = [
    { label: "Tổng mục", value: kpis.totalEntries },
    { label: "Đang sử dụng", value: kpis.activeEntries },
    { label: "Đã kiểm chứng", value: `${kpis.verifiedPercent ?? 0}%` },
    { label: "Sẵn sàng cho AI", value: `${kpis.aiReadyPercent ?? kpis.aiReadyScore}%` },
    { label: "Cần bổ sung", value: kpis.missingDataCount ?? 0 },
    { label: "Nháp", value: kpis.draftEntries },
  ];

  return (
    <div className="admin-kb-kpi-grid">
      {cards.map((card) => (
        <div key={card.label} className="admin-dashboard-card admin-kb-kpi-card">
          <p className="admin-dashboard-label">{card.label}</p>
          <p className="admin-dashboard-value">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

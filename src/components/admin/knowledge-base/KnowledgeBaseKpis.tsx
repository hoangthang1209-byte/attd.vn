import type { KnowledgeBaseKpis } from "@/features/knowledge-base/knowledge-base-types";

type Props = { kpis: KnowledgeBaseKpis };

export default function KnowledgeBaseKpisPanel({ kpis }: Props) {
  const cards = [
    { label: "Tổng entry", value: kpis.totalEntries },
    { label: "Đang dùng", value: kpis.activeEntries },
    { label: "Đã kiểm chứng", value: kpis.verifiedEntries },
    { label: "Nháp", value: kpis.draftEntries },
    { label: "Ưu tiên cao", value: kpis.highPriorityEntries },
    { label: "AI-ready score", value: `${kpis.aiReadyScore}%` },
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

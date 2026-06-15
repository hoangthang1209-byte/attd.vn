import type { KnowledgeBaseKpis } from "@/features/knowledge-base/knowledge-base-types";

type Props = { kpis: KnowledgeBaseKpis };

export default function KnowledgeBaseKpisPanel({ kpis }: Props) {
  const lastImport = kpis.lastImportAt
    ? new Date(kpis.lastImportAt).toLocaleDateString("vi-VN")
    : "—";

  const cards = [
    { label: "Total Entries", value: kpis.totalEntries },
    { label: "Verified %", value: `${kpis.verifiedPercent ?? 0}%` },
    { label: "AI Ready %", value: `${kpis.aiReadyPercent ?? kpis.aiReadyScore}%` },
    { label: "Missing Data", value: kpis.missingDataCount ?? 0 },
    { label: "Last Import", value: lastImport },
    { label: "Entries Added This Week", value: kpis.entriesAddedThisWeek ?? 0 },
  ];

  return (
    <div className="admin-kb-kpi-grid">
      {cards.map((card) => (
        <div key={card.label} className="admin-dashboard-card admin-kb-kpi-card">
          <p className="admin-dashboard-label">{card.label}</p>
          <p className="admin-dashboard-value">{card.value}</p>
          {card.label === "Last Import" && kpis.lastImportFilename && (
            <p className="admin-field-hint">{kpis.lastImportFilename}</p>
          )}
        </div>
      ))}
    </div>
  );
}

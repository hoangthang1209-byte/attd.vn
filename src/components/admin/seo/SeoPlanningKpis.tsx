import type { SeoPlanningKpis } from "@/features/blog/seo-planning-types";

type SeoPlanningKpisProps = {
  kpis: SeoPlanningKpis;
};

export default function SeoPlanningKpis({ kpis }: SeoPlanningKpisProps) {
  const cards = [
    { label: "Campaigns", value: kpis.campaigns },
    { label: "Clusters", value: kpis.clusters },
    { label: "Articles Planned", value: kpis.articlesPlanned },
    { label: "Articles Published", value: kpis.articlesPublished },
    { label: "Ready To Publish", value: kpis.readyToPublish },
    { label: "Overall Progress", value: `${kpis.overallProgressPercent}%` },
  ];

  return (
    <div className="admin-seo-kpi-grid">
      {cards.map((card) => (
        <div key={card.label} className="admin-dashboard-card admin-seo-kpi-card">
          <p className="admin-dashboard-label">{card.label}</p>
          <p className="admin-dashboard-value">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

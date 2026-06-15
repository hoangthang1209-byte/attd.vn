import type { SeoCampaign, SeoPlanStatus } from "@/features/blog/seo-planning-types";
import { SEO_PLAN_STATUSES, SEO_PLAN_STATUS_LABELS } from "@/features/blog/seo-planning-status";
import SeoKanbanColumn from "@/components/admin/seo/SeoKanbanColumn";

type SeoKanbanBoardProps = {
  campaign: SeoCampaign;
};

export default function SeoKanbanBoard({ campaign }: SeoKanbanBoardProps) {
  const columns = SEO_PLAN_STATUSES.map((status) => ({
    status,
    label: SEO_PLAN_STATUS_LABELS[status],
    items: campaign.items.filter((item) => item.status === status),
  })).filter((col) => col.items.length > 0 || isPrimaryColumn(col.status));

  return (
    <div className="admin-seo-kanban">
      {columns.map((column) => (
        <SeoKanbanColumn
          key={column.status}
          status={column.status}
          label={column.label}
          items={column.items}
          campaign={campaign}
        />
      ))}
    </div>
  );
}

function isPrimaryColumn(status: SeoPlanStatus): boolean {
  return (
    status === "CLUSTERED" ||
    status === "WRITING" ||
    status === "REVIEW" ||
    status === "PUBLISHED"
  );
}

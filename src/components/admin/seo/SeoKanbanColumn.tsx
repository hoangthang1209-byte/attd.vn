import type { SeoCampaign, SeoPlanItem, SeoPlanStatus } from "@/features/blog/seo-planning-types";
import SeoPlanItemCard from "@/components/admin/seo/SeoPlanItemCard";

type SeoKanbanColumnProps = {
  status: SeoPlanStatus;
  label: string;
  items: SeoPlanItem[];
  campaign: SeoCampaign;
};

export default function SeoKanbanColumn({
  label,
  items,
  campaign,
}: SeoKanbanColumnProps) {
  return (
    <section className="admin-seo-kanban-column">
      <header className="admin-seo-kanban-column-header">
        <h4>{label}</h4>
        <span className="admin-seo-kanban-count">{items.length}</span>
      </header>
      <div className="admin-seo-kanban-column-body">
        {items.length === 0 ? (
          <p className="admin-field-hint">Không có bài</p>
        ) : (
          items.map((item) => (
            <SeoPlanItemCard key={item.id} item={item} campaign={campaign} />
          ))
        )}
      </div>
    </section>
  );
}

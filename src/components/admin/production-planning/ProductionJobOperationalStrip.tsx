"use client";

import type { OrderItemExecutionBundle } from "@/features/orders/production-execution.service";
import type { ProductionPlanDetail } from "@/features/production-planning/production-plan.types";
import { deriveOperationalStrip } from "@/components/admin/production-planning/production-job-workspace";

type Props = {
  plan: ProductionPlanDetail;
  itemBundle: OrderItemExecutionBundle | null;
  onNavigate?: (tab: "documents" | "materials" | "qc" | "production") => void;
};

export default function ProductionJobOperationalStrip({ plan, itemBundle, onNavigate }: Props) {
  const blocks = deriveOperationalStrip(plan, itemBundle);

  return (
    <div className="prod-job-ops-strip" role="region" aria-label="Trạng thái vận hành">
      {blocks.map((block) => {
        const isClickable =
          block.label === "Tài liệu" ||
          block.label === "Vật tư" ||
          block.label === "QC" ||
          block.label === "Bước cần làm tiếp";

        const tabTarget =
          block.label === "Tài liệu"
            ? "documents"
            : block.label === "Vật tư"
              ? "materials"
              : block.label === "QC"
                ? "qc"
                : "production";

        return (
          <div
            key={block.label}
            className={`prod-job-ops-strip__block prod-job-ops-strip__block--${block.tone ?? "default"}${
              block.label === "Bước cần làm tiếp" ? " is-priority" : ""
            }`}
          >
            <span className="prod-job-ops-strip__label">{block.label}</span>
            {isClickable && onNavigate ? (
              <button
                type="button"
                className="prod-job-ops-strip__value prod-job-ops-strip__value--link"
                onClick={() => onNavigate(tabTarget)}
              >
                {block.primary}
              </button>
            ) : (
              <span className="prod-job-ops-strip__value">{block.primary}</span>
            )}
            {block.secondary && (
              <span className="prod-job-ops-strip__secondary">{block.secondary}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

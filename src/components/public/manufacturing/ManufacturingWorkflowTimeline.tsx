import ManufacturingEvidenceCard from "@/components/public/manufacturing/ManufacturingEvidenceCard";
import { getManufacturingWorkflowBySlug } from "@/lib/manufacturing/manufacturing.service";
import type { ManufacturingWorkflowFrontend } from "@/lib/manufacturing/manufacturing.types";

type Props = {
  slug?: string;
  workflow?: ManufacturingWorkflowFrontend | null;
  title?: string;
  description?: string;
  className?: string;
};

export default async function ManufacturingWorkflowTimeline({
  slug,
  workflow: providedWorkflow,
  title,
  description,
  className,
}: Props) {
  const workflow = providedWorkflow ?? (slug ? await getManufacturingWorkflowBySlug(slug) : null);
  if (!workflow || workflow.steps.length === 0) return null;

  return (
    <section
      className={["manufacturing-workflow-timeline", className].filter(Boolean).join(" ")}
      aria-label={title ?? workflow.name}
    >
      <header className="manufacturing-workflow-timeline__head">
        <h3 className="manufacturing-workflow-timeline__title">{title ?? workflow.name}</h3>
        {description ?? workflow.description ? (
          <p className="manufacturing-workflow-timeline__desc">
            {description ?? workflow.description}
          </p>
        ) : null}
      </header>
      <ol className="manufacturing-workflow-timeline__steps">
        {workflow.steps.map((step, index) => (
          <li key={step.id} className="manufacturing-workflow-timeline__step">
            <div className="manufacturing-workflow-timeline__marker">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="manufacturing-workflow-timeline__body">
              <h4>{step.title}</h4>
              {step.description ? <p>{step.description}</p> : null}
              {step.estimatedDuration ? (
                <span className="manufacturing-workflow-timeline__duration">
                  {step.estimatedDuration}
                </span>
              ) : null}
              {step.asset ? (
                <div className="manufacturing-workflow-timeline__asset">
                  <ManufacturingEvidenceCard item={step.asset} compact />
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

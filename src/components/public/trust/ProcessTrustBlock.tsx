import type { ProcessTrustStep } from "@/lib/b2b-trust-v2.types";

type Props = {
  title?: string;
  steps: readonly ProcessTrustStep[];
  reassurance?: string;
  ordered?: boolean;
  variant?: "default" | "compact";
  className?: string;
};

export default function ProcessTrustBlock({
  title,
  steps,
  reassurance,
  ordered = true,
  variant = "default",
  className,
}: Props) {
  if (steps.length === 0) return null;

  const ListTag = ordered ? "ol" : "ul";
  const classes = [
    "trust-process",
    `trust-process--${variant}`,
    ordered ? "trust-process--ordered" : "trust-process--bullets",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {title ? <p className="trust-process__title">{title}</p> : null}
      <ListTag className="trust-process__list">
        {steps.map((step) => (
          <li key={step.label} className="trust-process__item">
            <span className="trust-process__label">{step.label}</span>
            {step.description ? (
              <span className="trust-process__desc">{step.description}</span>
            ) : null}
          </li>
        ))}
      </ListTag>
      {reassurance ? <p className="trust-process__reassurance">{reassurance}</p> : null}
    </div>
  );
}

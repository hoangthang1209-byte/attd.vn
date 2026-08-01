type PanelSkeletonProps = {
  /** Accessible description of what is loading. */
  label: string;
  /** Number of shimmer lines under the header. */
  lines?: number;
  /** Renders a title placeholder above the lines. */
  withTitle?: boolean;
  /** Renders a block placeholder (chart, editor, media grid). */
  block?: boolean;
  className?: string;
};

/**
 * Panel-scoped loading placeholder. Only the panel that is waiting for data
 * skeletonizes — the surrounding workspace stays interactive.
 */
export default function PanelSkeleton({
  label,
  lines = 3,
  withTitle = true,
  block = false,
  className,
}: PanelSkeletonProps) {
  return (
    <div
      className={["attd-skeleton", className].filter(Boolean).join(" ")}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="attd-skeleton__label">{label}</span>
      {withTitle && <span className="attd-skeleton__title" aria-hidden="true" />}
      <div className="attd-skeleton__lines" aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <span
            key={index}
            className="attd-skeleton__line"
            style={{ width: `${96 - (index % 3) * 14}%` }}
          />
        ))}
      </div>
      {block && <span className="attd-skeleton__block" aria-hidden="true" />}
    </div>
  );
}

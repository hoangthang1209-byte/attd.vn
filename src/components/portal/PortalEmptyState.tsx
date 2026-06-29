type PortalEmptyStateProps = {
  title: string;
  description: string;
};

export default function PortalEmptyState({ title, description }: PortalEmptyStateProps) {
  return (
    <div className="portal-empty">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

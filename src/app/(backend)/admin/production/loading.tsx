export default function AdminProductionLoading() {
  return (
    <div className="admin-route-loading" aria-busy="true" aria-live="polite">
      <div className="admin-route-loading__bar">
        <div className="admin-route-loading__bar-inner" />
      </div>
      <div className="admin-route-loading__skeleton-grid">
        <div className="admin-route-loading__skeleton admin-route-loading__skeleton--title" />
        <div className="admin-route-loading__skeleton admin-route-loading__skeleton--wide" />
        <div className="admin-route-loading__skeleton admin-route-loading__skeleton--medium" />
        <div className="admin-route-loading__skeleton admin-route-loading__skeleton--short" />
      </div>
    </div>
  );
}

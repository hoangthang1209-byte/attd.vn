export default function PublicLoading() {
  return (
    <div className="public-loading" role="status" aria-label="Đang tải">
      <div className="public-loading-inner">
        <span className="nav-progress-spinner nav-progress-spinner--lg" />
        <p className="public-loading-text">Đang tải…</p>
      </div>
    </div>
  );
}

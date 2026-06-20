import AttdLogo from "@/components/public/AttdLogo";

type Props = {
  logoUrl?: string | null;
};

export default function QuotePublicLoading({ logoUrl }: Props) {
  return (
    <div className="quote-public-loading" role="status" aria-live="polite">
      <div className="quote-public-loading__inner">
        <AttdLogo variant="desktop" src={logoUrl} className="quote-public-loading__logo" />
        <p className="quote-public-loading__primary">Đang chuẩn bị báo giá của bạn</p>
        <p className="quote-public-loading__secondary">Vui lòng chờ trong giây lát…</p>
        <div className="quote-public-loading__progress" aria-hidden="true">
          <span className="quote-public-loading__progress-bar" />
        </div>
        <div className="quote-public-loading__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

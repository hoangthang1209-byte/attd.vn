import { TRUST_BANNER } from "@/lib/siteContent";

export default function TrustBanner() {
  return (
    <section className="trust-banner-section">
      <div className="container">
        <ul className="trust-banner-list">
          {TRUST_BANNER.items.map((item) => (
            <li key={item} className="trust-banner-item">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import { SOCIAL_PROOF } from "@/lib/siteContent";

export default function SocialProofSection() {
  return (
    <section className="section-compact section-alt">
      <div className="container">
        <h2 className="section-title section-title--center">
          {SOCIAL_PROOF.title}
        </h2>
        <div className="social-proof-grid">
          {SOCIAL_PROOF.metrics.map((metric) => (
            <div key={metric.label} className="social-proof-card">
              <div className="social-proof-value">{metric.value}</div>
              <div className="social-proof-label">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

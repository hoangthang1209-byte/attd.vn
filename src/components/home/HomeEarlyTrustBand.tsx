import Image from "next/image";
import { getVisibleClientLogosFromDb } from "@/features/client-logos/services/client-logo.service";
import { CLIENT_LOGOS_SECTION } from "@/lib/clientLogos";
import { isValidImageSrc } from "@/lib/imagePaths";
import type { HomepageProofItemConfig } from "@/features/home/homepage.types";
import { HOMEPAGE_PROOF_ICONS } from "@/features/home/homepage-proof-icons";

type Props = {
  enabled: boolean;
  proofItems: HomepageProofItemConfig[];
};

export default async function HomeEarlyTrustBand({ enabled, proofItems }: Props) {
  if (!enabled) return null;
  const logos = (await getVisibleClientLogosFromDb()).filter((client) =>
    isValidImageSrc(client.imageSrc),
  );
  const proof = proofItems
    .filter((item) => item.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (proof.length === 0 && logos.length === 0) return null;

  return (
    <section className="home-early-trust" aria-label="Bằng chứng nguồn hàng B2B">
      <div className="container">
        {proof.length > 0 ? (
          <ul className="home-early-trust__proof">
            {proof.map((item) => {
              const Icon = HOMEPAGE_PROOF_ICONS[item.iconKey];
              return (
                <li key={item.itemKey} className="home-early-trust__proof-item">
                  <Icon size={16} className="home-early-trust__proof-icon" aria-hidden />
                  <span>{item.title}</span>
                </li>
              );
            })}
          </ul>
        ) : null}

        {logos.length > 0 ? (
          <div className="home-early-trust__logos">
            <p className="home-early-trust__logos-label">{CLIENT_LOGOS_SECTION.title}</p>
            <div className="client-logo-grid home-early-trust__logo-grid">
              {logos.map((client) => {
                const inner = (
                  <Image
                    src={client.imageSrc}
                    alt={client.companyName}
                    width={120}
                    height={48}
                    className="client-logo-img"
                  />
                );

                if (client.website) {
                  return (
                    <a
                      key={client.id}
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="client-logo-card"
                      title={client.companyName}
                    >
                      {inner}
                    </a>
                  );
                }

                return (
                  <div key={client.id} className="client-logo-card" title={client.companyName}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

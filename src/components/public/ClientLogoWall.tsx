import { getVisibleClientLogosFromDb } from "@/features/client-logos/services/client-logo.service";
import { CLIENT_LOGOS_SECTION } from "@/lib/clientLogos";
import Image from "next/image";
import { isValidImageSrc } from "@/lib/imagePaths";

export default async function ClientLogoWall() {
  const logos = await getVisibleClientLogosFromDb();
  if (logos.length === 0) return null;

  return (
    <section className="section-compact section-alt">
      <div className="container">
        <h2 className="section-title section-title--center">
          {CLIENT_LOGOS_SECTION.title}
        </h2>
        <p className="section-description section-description--center">
          {CLIENT_LOGOS_SECTION.description}
        </p>

        <div className="client-logo-grid">
          {logos.map((client) => {
            if (!isValidImageSrc(client.imageSrc)) return null;

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
              <div
                key={client.id}
                className="client-logo-card"
                title={client.companyName}
              >
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

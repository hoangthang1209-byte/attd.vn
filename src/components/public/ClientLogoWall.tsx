import Image from "next/image";
import { CLIENT_LOGOS, CLIENT_LOGOS_SECTION } from "@/lib/clientLogos";
import { resolveUploadImage } from "@/lib/imagePaths";
import ImagePlaceholder from "@/components/public/ImagePlaceholder";

export default function ClientLogoWall() {
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
          {CLIENT_LOGOS.map((client) => {
            const logoSrc = resolveUploadImage("clients", client.logo);
            const inner = logoSrc ? (
              <Image
                src={logoSrc}
                alt={client.name}
                width={120}
                height={48}
                className="client-logo-img"
              />
            ) : (
              <ImagePlaceholder variant="client" label={client.name} compact />
            );

            if (client.url) {
              return (
                <a
                  key={client.id}
                  href={client.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="client-logo-card"
                  title={client.name}
                >
                  {inner}
                </a>
              );
            }

            return (
              <div key={client.id} className="client-logo-card" title={client.name}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

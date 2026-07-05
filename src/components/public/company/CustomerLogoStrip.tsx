import Image from "next/image";
import { getVisibleClientLogosFromDb } from "@/features/client-logos/services/client-logo.service";
import { CLIENT_LOGOS_SECTION } from "@/lib/clientLogos";
import { isValidImageSrc } from "@/lib/imagePaths";

type Props = {
  title?: string;
  description?: string;
  className?: string;
  variant?: "section" | "strip";
};

export default async function CustomerLogoStrip({
  title = CLIENT_LOGOS_SECTION.title,
  description = CLIENT_LOGOS_SECTION.description,
  className,
  variant = "section",
}: Props) {
  const logos = (await getVisibleClientLogosFromDb()).filter((client) =>
    isValidImageSrc(client.imageSrc),
  );
  if (logos.length === 0) return null;

  const classes = [
    "customer-logo-strip",
    variant === "strip" ? "customer-logo-strip--inline" : "section-compact section-alt",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} aria-label={title}>
      <div className="container">
        {variant === "section" ? (
          <>
            <h2 className="section-title section-title--center">{title}</h2>
            <p className="section-description section-description--center">{description}</p>
          </>
        ) : (
          <p className="customer-logo-strip__label">{title}</p>
        )}

        <div className="client-logo-grid">
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
    </section>
  );
}

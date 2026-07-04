import Image from "next/image";
import Link from "next/link";
import type { EvidenceItem } from "@/lib/b2b-trust-v2.types";
import { isValidImageSrc } from "@/lib/imagePaths";

type Props = {
  item: EvidenceItem;
};

export default function EvidenceCard({ item }: Props) {
  const hasImage = Boolean(item.imageUrl && isValidImageSrc(item.imageUrl));
  if (!hasImage) return null;

  const cardClass = [
    "trust-evidence-card",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <div className="trust-evidence-card__media">
        <Image
          src={item.imageUrl!}
          alt={item.alt ?? item.title}
          width={320}
          height={200}
          className="trust-evidence-card__image"
        />
      </div>
      <div className="trust-evidence-card__body">
        <span className="trust-evidence-card__category">{item.category}</span>
        <p className="trust-evidence-card__title">{item.title}</p>
        {item.description ? (
          <p className="trust-evidence-card__desc">{item.description}</p>
        ) : null}
      </div>
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className={`${cardClass} trust-evidence-card--link`}>
        {body}
      </Link>
    );
  }

  return <article className={cardClass}>{body}</article>;
}

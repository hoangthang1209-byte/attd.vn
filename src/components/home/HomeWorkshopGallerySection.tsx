import Image from "next/image";
import Link from "next/link";
import type {
  HomepageWorkshopGalleryConfig,
  HomepageWorkshopMediaConfig,
} from "@/features/home/homepage.types";

type Props = {
  gallery: HomepageWorkshopGalleryConfig;
};

function getVisibleItems(gallery: HomepageWorkshopGalleryConfig): HomepageWorkshopMediaConfig[] {
  return gallery.items
    .filter((item) => item.active && item.imageUrl)
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    })
    .slice(0, gallery.maxItems);
}

function getLayoutClass(gallery: HomepageWorkshopGalleryConfig, count: number) {
  if (count <= 1) return "home-workshop-gallery--single";
  if (count === 2) return "home-workshop-gallery--split";
  if (gallery.layout === "COMPACT_GRID") return "home-workshop-gallery--compact";
  if (gallery.layout === "HORIZONTAL_STRIP") return "home-workshop-gallery--strip";
  return "home-workshop-gallery--editorial";
}

function WorkshopCard({
  item,
  priority,
}: {
  item: HomepageWorkshopMediaConfig;
  priority?: boolean;
}) {
  const content = (
    <>
      <Image
        src={item.imageUrl!}
        alt={item.altText ?? item.caption ?? "Hình ảnh vận hành ATTD"}
        fill
        className="home-workshop-gallery__image"
        sizes={priority ? "(max-width: 1024px) 100vw, 640px" : "(max-width: 768px) 100vw, 320px"}
        priority={priority}
      />
      {item.caption ? (
        <span className="home-workshop-gallery__caption">{item.caption}</span>
      ) : null}
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="home-workshop-gallery__card">
        {content}
      </Link>
    );
  }

  return <figure className="home-workshop-gallery__card">{content}</figure>;
}

export default function HomeWorkshopGallerySection({ gallery }: Props) {
  const items = getVisibleItems(gallery);
  if (!gallery.enabled || items.length === 0) return null;

  const layoutClass = getLayoutClass(gallery, items.length);

  return (
    <section
      className={`mp-section mp-section--tight home-workshop-gallery ${layoutClass}`}
      aria-labelledby="home-workshop-gallery-title"
    >
      <div className="container">
        <div className="home-workshop-gallery__header">
          <p className="home-workshop-gallery__eyebrow">{gallery.eyebrow}</p>
          <h2 id="home-workshop-gallery-title" className="home-workshop-gallery__title">
            {gallery.title}
          </h2>
          {gallery.description ? (
            <p className="home-workshop-gallery__description">{gallery.description}</p>
          ) : null}
        </div>

        <div className="home-workshop-gallery__grid">
          {items.map((item, index) => (
            <WorkshopCard key={item.id || item.mediaAssetId} item={item} priority={index === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";
import {
  hasVisibleDescriptionBlocks,
  type PublicProductDescriptionBlock,
} from "@/features/products/product-description-blocks";

type Props = {
  blocks: PublicProductDescriptionBlock[] | null | undefined;
  /** Compact admin preview — same markup, slightly tighter class hooks. */
  preview?: boolean;
};

function DescriptionImage({
  src,
  alt,
  caption,
  layout,
  priority = false,
}: {
  src: string;
  alt: string;
  caption?: string;
  layout?: "full" | "content";
  priority?: boolean;
}) {
  return (
    <figure
      className={`mp-pdp-desc-figure${layout === "full" ? " mp-pdp-desc-figure--full" : ""}`}
    >
      <div className="mp-pdp-desc-figure__frame">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={layout === "full" ? "100vw" : "(max-width: 768px) 100vw, 860px"}
          className="mp-pdp-desc-figure__img"
          loading={priority ? undefined : "lazy"}
          priority={priority}
        />
      </div>
      {caption?.trim() ? <figcaption className="mp-pdp-desc-figure__caption">{caption}</figcaption> : null}
    </figure>
  );
}

/**
 * Server-safe rich product description renderer.
 * Prefer this over duplicating markup in admin preview.
 */
export default function ProductDescriptionBlocks({ blocks, preview = false }: Props) {
  if (!hasVisibleDescriptionBlocks(blocks)) return null;

  return (
    <div className={`mp-pdp-desc-blocks${preview ? " mp-pdp-desc-blocks--preview" : ""}`}>
      {blocks!.map((block, index) => {
        if (block.type === "heading") {
          const Tag = block.level === 3 ? "h3" : "h2";
          return (
            <Tag key={block.id} className="mp-pdp-desc-blocks__heading">
              {block.text}
            </Tag>
          );
        }
        if (block.type === "paragraph") {
          return (
            <p key={block.id} className="mp-pdp-desc-blocks__paragraph">
              {block.text}
            </p>
          );
        }
        if (block.type === "bulletList") {
          return (
            <ul key={block.id} className="mp-pdp-desc-blocks__list">
              {block.items.map((item, itemIndex) => (
                <li key={`${block.id}-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "image") {
          return (
            <DescriptionImage
              key={block.id}
              src={block.imageUrl}
              alt={block.alt}
              caption={block.caption}
              layout={block.layout}
              priority={preview && index === 0}
            />
          );
        }
        if (block.type === "imageGrid") {
          return (
            <div key={block.id} className="mp-pdp-desc-blocks__grid">
              {block.items.map((item, itemIndex) => (
                <DescriptionImage
                  key={`${block.id}-${item.mediaId}-${itemIndex}`}
                  src={item.imageUrl}
                  alt={item.alt}
                  caption={item.caption}
                  layout="content"
                />
              ))}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

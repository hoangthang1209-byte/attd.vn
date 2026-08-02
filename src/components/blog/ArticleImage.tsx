import Image from "next/image";

export type ArticleImageProps = {
  src: string;
  /** Required by the renderer contract: an image with no alt cannot be placed. */
  alt: string;
  width: number;
  height: number;
  caption?: string;
  credit?: string;
  /** `content` stays inside the reading column; `full` breaks out of it. */
  variant?: "content" | "full";
  /** Only the hero should be eager; body images load as they approach. */
  priority?: boolean;
};

/**
 * The contract for images placed inside an article body. Width and height are
 * mandatory so the aspect ratio is reserved before the file arrives and the
 * text below never shifts.
 */
export default function ArticleImage({
  src,
  alt,
  width,
  height,
  caption,
  credit,
  variant = "content",
  priority = false,
}: ArticleImageProps) {
  if (!alt.trim()) return null;

  return (
    <figure
      className={`article-figure article-figure--${variant}`}
      style={{ ["--article-figure-ratio" as string]: `${width} / ${height}` }}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={
          variant === "full"
            ? "(max-width: 960px) 100vw, 1120px"
            : "(max-width: 768px) 100vw, 760px"
        }
        loading={priority ? "eager" : "lazy"}
        priority={priority}
        className="article-figure__img"
      />

      {(caption || credit) && (
        <figcaption className="article-figure__caption">
          {caption}
          {credit && <span className="article-figure__credit">Nguồn: {credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}

type InternalLinkBlockProps = {
  title: string;
  links: { href: string; label: string }[];
  alt?: boolean;
};

export default function InternalLinkBlock({
  title,
  links,
  alt = false,
}: InternalLinkBlockProps) {
  return (
    <section className={alt ? "section-alt section-compact" : "section-compact"}>
      <div className="container" style={{ maxWidth: 860 }}>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#111827",
            marginBottom: 20,
          }}
        >
          {title}
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {links.map((link) => (
            <a key={link.href} href={link.href} className="link-chip">
              {link.label}
              <span aria-hidden style={{ color: "#9ca3af" }}>
                →
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

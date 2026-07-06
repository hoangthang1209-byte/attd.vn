import type { FooterSocialLink } from "@/lib/footer-config";

type Props = {
  links: readonly FooterSocialLink[];
};

export default function FooterSocialLinks({ links }: Props) {
  if (links.length === 0) return null;

  return (
    <div className="site-footer-social">
      <p className="site-footer-heading site-footer-heading--social">Kết nối</p>
      <div className="site-footer-social-links">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="site-footer-social-link"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

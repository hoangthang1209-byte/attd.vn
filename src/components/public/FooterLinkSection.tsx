import Link from "next/link";
import type { FooterLink } from "@/lib/footer-config";

type Props = {
  title: string;
  links: readonly FooterLink[];
  className?: string;
};

export default function FooterLinkSection({ title, links, className }: Props) {
  return (
    <details className={["site-footer-accordion", className].filter(Boolean).join(" ")}>
      <summary className="site-footer-heading">{title}</summary>
      <div className="site-footer-links">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="site-footer-link">
            {link.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

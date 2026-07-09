"use client";

import Link from "next/link";
import type { FooterLink } from "@/lib/footer-config";
import { trackInferredPublicLinkClick } from "@/lib/analytics";

type Props = {
  title: string;
  links: readonly FooterLink[];
  className?: string;
};

function FooterLinks({ title, links }: Pick<Props, "title" | "links">) {
  return (
    <nav className="site-footer-links" aria-label={title}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="site-footer-link"
          onClick={() => trackInferredPublicLinkClick(link.href, "footer_nav")}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export default function FooterLinkSection({ title, links, className }: Props) {
  return (
    <div className={["site-footer-nav-group", className].filter(Boolean).join(" ")}>
      <details className="site-footer-nav site-footer-nav--mobile">
        <summary className="site-footer-heading">{title}</summary>
        <FooterLinks title={title} links={links} />
      </details>
      <section className="site-footer-nav site-footer-nav--desktop" aria-label={title}>
        <p className="site-footer-heading">{title}</p>
        <FooterLinks title={title} links={links} />
      </section>
    </div>
  );
}

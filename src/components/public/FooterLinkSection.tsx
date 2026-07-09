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
    <nav className="footer-enterprise-nav__links" aria-label={title}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="footer-enterprise-nav__link"
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
    <div className={["footer-enterprise-nav", className].filter(Boolean).join(" ")}>
      <details className="footer-enterprise-nav__accordion">
        <summary className="footer-enterprise-nav__heading">{title}</summary>
        <FooterLinks title={title} links={links} />
      </details>
      <section className="footer-enterprise-nav__column" aria-label={title}>
        <p className="footer-enterprise-nav__heading">{title}</p>
        <FooterLinks title={title} links={links} />
      </section>
    </div>
  );
}

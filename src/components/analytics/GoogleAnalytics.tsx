"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackPageView } from "@/lib/analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Injects the GA4 gtag.js script and tracks page views on App Router
 * client-side navigations. Renders nothing when GA_ID is absent.
 *
 * Must be rendered inside a Server Component (e.g. root layout) as a
 * Client Component subtree so that `usePathname` is available.
 */
export default function GoogleAnalytics() {
  const pathname = usePathname();

  // Fire a page_view on every navigation (including the first mount).
  // The init script below uses send_page_view: false to prevent the
  // automatic duplicate on initial load.
  useEffect(() => {
    if (!GA_ID) return;
    trackPageView(pathname);
  }, [pathname]);

  if (!GA_ID) return null;

  return (
    <>
      {/* Load the GA4 measurement library */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />

      {/* Initialize gtag; suppress the automatic initial page_view so the
          useEffect above is the single source of truth for all page views. */}
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { 'send_page_view': false });
        `}
      </Script>
    </>
  );
}

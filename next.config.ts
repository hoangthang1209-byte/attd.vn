import type { NextConfig } from "next";

const BLOB_HOSTNAME =
  process.env.BLOB_STORE_HOSTNAME ??
  "0iitstjrwqim8udr.public.blob.vercel-storage.com";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "puppeteer-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/quotes/[id]/pdf/route": [
      "./node_modules/dejavu-fonts-ttf/ttf/**/*",
      "./node_modules/@sparticuz/chromium/**/*",
    ],
    "/api/quotes/public/[token]/pdf/route": [
      "./node_modules/dejavu-fonts-ttf/ttf/**/*",
      "./node_modules/@sparticuz/chromium/**/*",
    ],
    "/api/quotes/pdf-health/route": [
      "./node_modules/dejavu-fonts-ttf/ttf/**/*",
    ],
    "/api/quotes/pdf-renderer-health/route": [
      "./node_modules/@sparticuz/chromium/**/*",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: BLOB_HOSTNAME,
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/quan-tri",
        destination: "/admin",
        permanent: true,
      },
      {
        source: "/quan-tri/:path*",
        destination: "/admin/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

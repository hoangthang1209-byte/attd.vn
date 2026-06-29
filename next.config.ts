import type { NextConfig } from "next";

const BLOB_HOSTNAME =
  process.env.BLOB_STORE_HOSTNAME ??
  "0iitstjrwqim8udr.public.blob.vercel-storage.com";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "puppeteer-core", "@sparticuz/chromium"],
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
      {
        source: "/dealer",
        destination: "/portal",
        permanent: false,
      },
      {
        source: "/dealer/login",
        destination: "/portal/login",
        permanent: false,
      },
      {
        source: "/dealer/rfq",
        destination: "/portal/rfq",
        permanent: false,
      },
      {
        source: "/dealer/rfq/:path*",
        destination: "/portal/rfq/:path*",
        permanent: false,
      },
      {
        source: "/dealer/quotes",
        destination: "/portal/quotes",
        permanent: false,
      },
      {
        source: "/dealer/resources",
        destination: "/portal/resources",
        permanent: false,
      },
      {
        source: "/dealer/:path*",
        destination: "/portal/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

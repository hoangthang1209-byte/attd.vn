import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: process.env.BLOB_STORE_HOSTNAME
      ? [
          {
            protocol: "https",
            hostname: process.env.BLOB_STORE_HOSTNAME,
          },
        ]
      : [],
  },
};

export default nextConfig;

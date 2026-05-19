import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // remotePatterns supersedes the deprecated `domains` array in Next.js 15.
    // The world-atlas CDN is fetched client-side by react-simple-maps (plain
    // fetch, not <Image>), but listing it here documents the external dependency
    // and covers any future map-tile or flag-image additions.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
        pathname: "/npm/world-atlas@2/**",
      },
    ],
  },

  async headers() {
    return [
      {
        // API routes should never be served stale — opt out of all caching.
        // Adjust per-route in Phase 4 when real endpoints are added.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: true,
  cacheComponents: true,
  cacheLife: {
    "hr-data": {
      stale: 300,
      revalidate: 3600,
      expire: 21600,
    },
    "hr-metadata": {
      stale: 300,
      revalidate: 86400,
      expire: 604800,
    },
  },
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  // Turbopack root configuration for monorepo support
  // In Docker builds, TURBOPACK_ROOT is set to /app (monorepo root)
  // In local development, resolve to monorepo root (two levels up from apps/web)
  turbopack: {
    root: process.env.TURBOPACK_ROOT || path.resolve(__dirname, "../.."),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  transpilePackages: ["@workspace/ui", "@workspace/db"],
};

export default nextConfig;

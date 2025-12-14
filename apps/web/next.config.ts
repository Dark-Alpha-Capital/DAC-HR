import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  cacheComponents: true,
  cacheLife: {
    // HR data: Changes infrequently but needs to be fresh when it does
    "hr-data": {
      stale: 300, // 5 minutes - fast client navigation
      revalidate: 3600, // 1 hour - reasonable refresh cycle
      expire: 21600, // 6 hours - prevents very stale data
    },
    // HR metadata: Positions, departments change rarely
    "hr-metadata": {
      stale: 300, // 5 minutes
      revalidate: 86400, // 1 day - positions rarely change
      expire: 604800, // 1 week
    },
  },
  experimental: {
    turbopackFileSystemCacheForDev: true,
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

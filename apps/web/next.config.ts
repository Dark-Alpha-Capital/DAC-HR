import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  cacheComponents: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  transpilePackages: ["@workspace/ui", "@workspace/db"],
};

export default nextConfig;

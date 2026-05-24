import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  // assetPrefix needs the trailing slash so generated <link> tags resolve
  // correctly when served under GitHub Pages’ /TR-STORY/ prefix.
  assetPrefix: basePath ? `${basePath}/` : undefined,
  turbopack: {
    root: __dirname,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "trimage.rhaon.co.kr" },
    ],
  },
};

export default nextConfig;

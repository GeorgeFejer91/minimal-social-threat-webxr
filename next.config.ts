import type { NextConfig } from "next";

const assetPrefix = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  assetPrefix: assetPrefix || undefined,
  trailingSlash: true,
};

export default nextConfig;

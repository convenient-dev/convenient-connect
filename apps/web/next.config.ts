import path from "path";
import type { NextConfig } from "next";
// @ts-expect-error - no types published for this package
import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  outputFileTracingIncludes: {
    "/api/**/*": ["./lib/generated/prisma/**/*"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
};

export default nextConfig;

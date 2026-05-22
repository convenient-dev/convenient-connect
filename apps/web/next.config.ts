import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  outputFileTracingIncludes: {
    "/api/**/*": ["./apps/web/lib/generated/prisma/**/*"],
  },
};

export default nextConfig;

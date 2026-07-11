import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @tars/contracts is consumed type-only (types are erased at build); nothing
  // from the workspace is bundled at runtime, so no transpilePackages are needed.
};

export default nextConfig;

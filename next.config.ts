import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Keep Turbopack rooted on this app (avoids picking up a parent lockfile).
  turbopack: {
    root,
  },
};

export default nextConfig;

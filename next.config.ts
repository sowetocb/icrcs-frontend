import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Emit a self-contained server build (.next/standalone/server.js) for the
  // Docker runner stage (COPY .next/standalone + `node server.js`).
  output: "standalone",
};

export default nextConfig;

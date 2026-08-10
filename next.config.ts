import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Next 16.3 adapters conflict with standalone output; Vercel uses the default output.
    output: process.env.VERCEL ? undefined : "standalone",
    reactStrictMode: false,
};

export default nextConfig;

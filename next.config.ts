import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Next 16.3 adapters conflict with standalone output; Vercel uses the default output.
    output: process.env.VERCEL ? undefined : "standalone",
    reactStrictMode: false,
    experimental: {
        // TypeScript 6 CLI emits no --showConfig JSON when Next captures stdout.
        useTypeScriptCli: false,
    },
};

export default nextConfig;

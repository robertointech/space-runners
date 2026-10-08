import type { NextConfig } from "next";

// Disable Next.js telemetry
process.env.NEXT_TELEMETRY_DISABLED = "1";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  webpack: config => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    config.externals.push(
      "pino-pretty",
      "lokijs",
      "encoding",
      "@stripe/stripe-js",
      // Match any @x402/* sub-path imports (e.g. @x402/evm/upto/client)
      ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
        if (request && request.startsWith("@x402/")) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      },
    );
    return config;
  },
};

const isIpfs = process.env.NEXT_PUBLIC_IPFS_BUILD === "true";

if (isIpfs) {
  nextConfig.output = "export";
  nextConfig.trailingSlash = true;
  nextConfig.images = {
    unoptimized: true,
  };
}

module.exports = nextConfig;

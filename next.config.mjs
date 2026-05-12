/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // PLACEHOLDER IMAGES — swap to your CDN / public/ folder before launch
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
  },
  webpack: (config, { isServer }) => {
    // Some dependencies use the modern "node:fs" import scheme which
    // webpack 5 in Next 14 doesn't recognise by default. This rule tells
    // webpack to be lenient about strict ESM module specifiers.
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: { fullySpecified: false },
    });

    // On the client side, stub Node built-ins. Combined with the
    // `import "server-only"` guard in lib/blog.ts, this means:
    //   - If a client component accidentally imports lib/blog.ts:
    //     build fails immediately with a clear "server-only" error
    //   - If a dependency innocently references `fs` in shared code:
    //     it gets stubbed out cleanly on the client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    return config;
  },
};

export default nextConfig;
